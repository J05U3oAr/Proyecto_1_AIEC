# Integración para M3 — Pedro: libros, evidencia y evals

Actualización M3.1–M3.3 (17/11/2026): búsqueda, detalles, vínculo y premisas
implementados en `mcp/books/`; cinco películas/cuatro novelas. `Agent.run` integra
comparación acotada a evidencia mediante `sofia/comparison.py`. Se conserva el
contrato; M4 dispone de [cuatro fixtures](fixtures/) validados. El probe permite
Books real con identidad revisada y recorrido HTTP/widget con selección TMDB
ya verificado. M3.4 dispone de 22 casos controlados y, en `m34-v2`, nueve casos
funcionales mediante `RemoteMCP` real; ver [operación de evals](../../evals/README.md).
Las corridas OWASP del modelo real y los efectos de navegador siguen pendientes.
La descripción del traspaso M2 de abajo es histórica; consultar
[operación y evidencia actuales](../../mcp/books/README.md).

Actualizado el 15/11/2026, después de integrar metadatos TMDB. Referencia local:
`95c25fb`; al revisar, `feat/mcp` coincide con el tracking local `origin/feat/mcp`
y el usuario confirma el push. Esto no acredita un run verde de GitHub Actions,
protección de `main` ni revisión humana del PR.

## Qué recibes y qué falta

Disponibles: backend/agente de M1, MCP películas de M2, sesiones Redis, cliente
HTTP con sesión en memoria, herramientas de caché/cuota compartidas, contenedores
y checks. Ver [operación MCP](../../mcp/README.md), [contratos](../../shared/contracts/README.md)
y [conversación](conversacion.md).

M3 debe implementar el servidor de libros y el harness. `TOOLS` ya declara sus
nombres y el consumidor `RemoteMCP` ya sabe dirigirlos al servidor `books`;
esto no significa que el proveedor o las herramientas estén implementados.
Compose aún no inicia un servicio `books`. M4 mantiene tarjetas, acciones de
navegación enriquecidas y Créditos visibles. No duplicar el agente de M1.

## Contratos que debes reutilizar

Fuente runtime: `server/sofia/models.py`; registro y validación de herramientas:
`server/sofia/tools.py`. Schemas neutrales: `shared/contracts/v1/`.
No definir modelos divergentes ni copiar schemas manualmente.

| Herramienta           | Argumentos                                     | Resultado exitoso `ToolResult`                                         |
| --------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| `search_books`        | `query`: texto 1–4000; `limit`: 1–5, defecto 3 | `books` hasta el límite, sin películas ni adaptación                   |
| `book_details`        | `bookId`: identificador canónico               | `books`: cero o un libro cuyo ID coincida; sin películas ni adaptación |
| `adaptation_evidence` | `movieId`: entero positivo TMDB                | `adaptation` obligatorio con ese `movieId`; `movies` y `books` vacíos  |

`Book`: ID, título, autores (lista), año nullable, descripción y URL. El
identificador cumple `^[A-Za-z0-9_-]{1,128}$`; el enlace canónico es
`https://books.google.com/books?id={id}` y su ID debe coincidir. No publicar URLs
arbitrarias del proveedor ni aceptar booleanos como enteros. Validar mediante
los modelos y `validate_result` antes de publicar/cachear.

`Adaptation.status`: `confirmed`, `uncertain` o `not_found`. `confirmed` requiere
libro y al menos una evidencia con `statement` y `source`; incluir limitaciones.
Una coincidencia de títulos no confirma el vínculo. Un fallo de API es un error,
no `not_found`; este último tampoco debe presentarse como prueba universal de
que no existe una adaptación.

**Límite actual de fuentes:** `Source.provider` solo admite `tmdb`, `imdb` y
`google_books`, con políticas estrictas de URL. Si la evidencia exige otra fuente
pública, coordinar con M1 una ampliación explícita del modelo, allowlist, schemas
y pruebas antes de integrarla. No etiquetar una fuente externa como Google Books
ni afirmar que una descripción de catálogo confirma algo que no dice.

### Metadatos nuevos de películas

`Movie` conserva sus campos anteriores y añade los siguientes opcionales:

| Campo        | Semántica                                                            |
| ------------ | -------------------------------------------------------------------- |
| `genres`     | Lista de nombres verificados; defecto `[]`                           |
| `runtime`    | Minutos positivos o `null`; cero del proveedor se normaliza a `null` |
| `tmdbRating` | Promedio TMDB entre 0 y 10 o `null`; exige votos positivos           |
| `voteCount`  | Entero no negativo o `null`                                          |

La presentación redondea la nota a un decimal e incluye los votos. La precisión
original queda en el objeto. No es puntuación IMDb ni evidencia de adaptación.
Las entradas antiguas sin estos campos siguen siendo válidas en el modelo nuevo;
consumidores con schemas antiguos y `additionalProperties: false` deben actualizar
sus validadores. Regenerar con `cd server && make contracts` únicamente cuando
se cambie un modelo acordado; `make check` verifica que no exista divergencia.

## Transporte, arranque y errores

Reutilizar el patrón de `movies/server.py`: MCP Streamable HTTP en `/mcp`,
`structuredContent`, schemas canónicos, servicio sin estado conversacional,
autenticación Bearer con `MCP_TOKEN`, límites de tiempo/cuerpo, rechazo de Origin
y validación de host. Las herramientas son de consulta, sin shell/fetch genérico.
No copiar las rutas/nombres de películas a libros sin adaptarlos.

El consumidor usa `BOOKS_MCP_URL=http://localhost:8002/mcp` fuera de Compose;
dentro de la red Compose está previsto `http://books:8002/mcp`, configurable con
`BOOKS_MCP_CONTAINER_URL`. M3 debe añadir servicio en `infra/compose.yaml`, Dockerfile en `infra/docker/`, health checks y
variables de ejemplo sin secretos, coordinando con M2. Mantener el puerto ligado
a loopback y no publicar Redis/MCP al exterior. No hace falta modificar el
widget para que `RemoteMCP` dirija las tres herramientas registradas a libros.

Usar errores MCP `isError=true` con este envelope, sin texto de excepciones:

```json
{ "error": { "code": "provider_rate_limited", "retryable": true, "retryAfter": 60 } }
```

Referencia: `CatalogError` y traducción de errores en `movies/server.py`.
Cuota/rate limit se traducen en el consumidor a HTTP 429 y timeout a 504;
los demás errores se normalizan sin reenviar mensajes arbitrarios. No envolver
el envelope de error en un `ToolResult` exitoso ni devolver listas vacías ante
fallos de autenticación, red o cuota.

## Caché y presupuesto compartidos

Reutilizar `catalog_common.cache.CatalogCache(redis, "google_books", daily_limit, ttl)`.
Todos los procesos del mismo proveedor comparten namespace y Redis. El límite
admite 1–1000 solicitudes/día y TTL 1–86400 segundos. No usar namespace `tmdb`.
1,000 es presupuesto del curso; no atribuirlo como cuota oficial de Google Books.

- `await cache.get(key, fetch)` reutiliza datos y coordina un único fetch por clave.
  La clave debe incluir versión de formato, operación, idioma y argumentos
  normalizados. No incluir tokens, URLs arbitrarias ni datos privados.
- En `fetch`, ejecutar `await cache.take()` antes de **cada intento HTTP**,
  incluidos reintentos, y validar la respuesta antes de devolver el diccionario.
  El helper no valida el contrato del proveedor por sí solo.
- El día se calcula con la hora UTC de Redis. Las réplicas no obtienen presupuestos
  separados; si difieren los límites se aplica el menor durante ese día.
- Ante 429, usar `await cache.cooldown(seconds)` compartido y un error tipado.
  Un cache hit válido puede responder durante cuota agotada/cooldown.
- Redis caído debe impedir llamadas externas sin contabilizar. El helper espera
  hasta unos dos segundos por un lock, luego `catalog_busy`; el lock expira en
  60 segundos. Acotar el callback por debajo de ese plazo.
- No cachear fallos como libros ausentes ni confirmar adaptaciones mediante el LLM.
  Versionar claves cuando cambie el formato; no borrar cuotas ni cambiar namespace
  para recuperar presupuesto. M2 versionó sus claves de metadatos, manteniendo cuota.

## Harness: ejecutar el mismo agente

Adaptar HDT6 según [reutilización de evals](../delivery/reutilizacion-evals.md).
Usar `Agent.run(ChatRequest, history, context, request_id)` con adaptadores de
producción para evals reales; conservar entre turnos el historial y el contexto
correspondientes. `TurnResult` aporta `response`, `context`, `trace` y `usage`;
`PublicError` conserva `trace` y `usage`. No enviar trazas al navegador ni
registrar tokens, prompts privados o datos personales. En HTTP, conservar
`sessionId` y `X-Session-Token` por sesión; enviar el token solo en header y
borrar únicamente las sesiones de prueba al terminar.

Partir de `server/evaluation_cases.json` (casos para integrar, **no reporte real**).
Mantener dataset mínimo, tres repeticiones y umbrales de
[tu asignación](../delivery/miembro-3-libros-evals.md); no rebajarlos por los resultados.
Añadir regresiones para los cambios recientes:

- «hola», capacidades y agradecimiento: respuesta local, sin LLM/MCP ni acciones.
- «Cars → 2006», «Cars 2006» y «Shrek 1»: selección del recurso correcto.
- «Cars 2 → y su puntuación / cuánto dura / qué género tiene»: campos verificables.
- Cambio de título («Cars 2, qué puntuación tiene») no reutiliza otra película;
  las sesiones antiguas incompletas se actualizan al solicitar metadatos.
- No atribuir nota TMDB a IMDb ni aceptar puntuaciones inventadas del modelo.
- Código fuera del ámbito, solicitudes mixtas, extracción de instrucciones,
  inyección en sinopsis/descripciones/evidencia y canarios sintéticos.
- Adaptación confirmada, homónimo, incertidumbre, resultados vacíos y fallo parcial;
  nunca fabricar diferencias de escenas o fingir lectura íntegra.

Los títulos y metadatos pueden resolverse sin inferencia LLM. Un saludo correcto
o una búsqueda determinista no acredita resistencia del modelo: probar también
el camino LLM con recomendaciones/comparaciones y ataques indirectos. La defensa
actual usa routing, validación de herramientas y filtros de salida; no garantiza
bloqueo absoluto ni reemplaza tus evals. M4 verifica efectos de navegación reales.

## Incorporación a checks y CI

Conservar Python 3.12 y `server/uv.lock`. No introducir otra instalación del SDK
MCP en el frontend. Si hacen falta dependencias, actualizar manifest/lock juntos.

1. Añadir `mcp/books/` a `source` de cobertura en `server/pyproject.toml` y a la lista
   `files` de mypy; añadir también su ruta al comando explícito mypy en
   `server/Makefile`. Para Python productivo en `evals/`, incorporarlo igualmente.
2. Si los tests van en `mcp/tests/`, pytest ya los descubre. Si van en otra carpeta,
   ampliar `testpaths`/`pythonpath` y el alcance Ruff/formato sin ocultar archivos.
   Incluir `books` entre imports propios de Ruff si corresponde.
3. `scripts/check_coverage.py` exige ≥80% en cuatro métricas de cada archivo del
   reporte: incorporar las rutas nuevas a cobertura es indispensable para medirlas.
   No bajar umbrales ni compensar módulos sin probar.
4. `python-checks` ejecuta `make check` y Redis de pruebas; `container-checks`
   debe construir/comprobar también libros cuando exista. Usar credenciales
   sintéticas y proveedores simulados en PR, sin red externa ni LLM real.
5. Añadir el comando real del harness a docs/CI determinista cuando se implemente.
   La suite real consume cuota y se ejecuta explícitamente con presupuesto,
   dataset/configuración versionados y todos los fallos reportados.

Comprobación disponible hoy, desde raíz:

```bash
npm ci
cd server
uv sync --frozen --python 3.12
cd ..
docker compose -p sofia-m2-test -f infra/compose.test.yaml up -d --wait
npm run check:python
npm run lint
npm run format:check
npm run test:coverage
npm run test:e2e
npm run build
npm run build:sdk
```

Usar Redis de pruebas aislado (`localhost:16379/15` backend, `/14` catálogo),
sin tráfico ajeno. Las pruebas existentes limpian sus claves; no hacer `FLUSHALL`
ni borrar volúmenes del entorno de desarrollo.

## Evidencia recibida y cierre pendiente

Última verificación M2: **248 tests Python y 70 frontend**, tipos/lint/formato,
schemas, cobertura por archivo Python y builds aprobados. Evidencia real de
[siete consultas de metadatos](../evidence/m2/metadata-check.json) y
[widget](../evidence/m2/metadata-browser.jpg); diez casos previos en
[dialogue-check.json](../evidence/m2/dialogue-check.json). Son registros históricos,
no sobrescribir ni presentarlos como evals de libros/OWASP. Votos/notas cambian.

M3 entrega su MCP independiente, fuentes válidas, adaptación sustentada,
comparación integrada, pruebas offline en CI y reporte de evals real. Coordinan
M1/M2/M4 la prueba conjunta y revisión humana. Siguen sin acreditarse aquí el
arranque completo desde clon limpio, CI remoto verde, protección de `main`,
aprobación del PR ni el cierre global de la entrega. Ningún agente hace commits,
push, merge o modifica reglas remotas.
