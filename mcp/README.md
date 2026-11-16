# M2 — Catálogo de películas MCP y utilidades de proveedor

Implementación de Hugo para la segunda entrega. Usa Python 3.12 y el SDK MCP
oficial 1.30.0 ya fijado por M1 en `server/uv.lock`; no incorpora otro framework
agéntico ni dependencias del servidor al SDK del navegador.

## Herramientas y contrato aceptado por M2

Se aceptan los schemas v1 de M1 **sin cambiar los campos públicos**. Sus modelos
runtime (`sofia.models`) son la fuente de validación compartida. El contenedor
MCP incluye esos validadores, no importa ni ejecuta el agente. Otro cliente MCP
puede usar el servicio sin el widget o el backend conversacional.

| Tool            | Entrada                                                                      | Salida                                                   |
| --------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| `search_movies` | `query` (1–4000 caracteres), `genre?`, `maxRuntime?` (1–600), `limit?` (1–5) | `ToolResult` con películas y fuentes/URLs verificadas    |
| `movie_details` | `movieId` entero positivo                                                    | Una película o colección vacía ante 404/contenido adulto |

Las tools publican schemas canónicos, `structuredContent` y anotación de solo
lectura. Se rechazan propiedades extra, bool como ID, IDs de otro recurso,
URLs arbitrarias y entradas fuera de límites. Se exige el token MCP incluso en
local. Los nombres son públicos; no son secretos del prompt.

### Semántica de búsqueda

- Para un título: `{"query":"Dune","limit":3}`. Se consulta `/search/movie` y
  se recuperan detalles de hasta cinco candidatos, sin mezclar remakes por título.
- Para preferencias: `{"query":"recomendaciones","genre":"Ciencia ficción","maxRuntime":120}`.
  Se resuelve el género desde TMDB y se usa `/discover/movie`. También se reconoce
  un nombre de género conocido como query. No se interpreta libremente lenguaje
  natural en el adaptador: el agente debe transformar la petición en argumentos.
- Si se especifican título y género, se busca el título y se filtra por género.
  Se verifica también runtime con detalles: duración desconocida no satisface un
  máximo. La primera página y los cinco candidatos acotan costo; no se promete
  recuperar todos los resultados del catálogo.
- Sin resultados se devuelve lista vacía. API caída, género desconocido o cuota
  son errores explícitos, no listas vacías ni hechos inventados.
- Pósteres: validar `/configuration`, origen HTTPS fijo y tamaño `w500`, luego
  `poster_path`. IMDb proviene del `imdb_id` del detalle, no del texto del modelo.
  Campos ausentes son null; título/año y datos de distintas películas no se fusionan.
- Las sinopsis se conservan como datos no confiables, sin ejecutarlas. Se limita
  su longitud presentada a 2,000 caracteres; no se fabrica contenido alternativo.

## Configuración y credenciales

Desde la raíz: copiar `.env.example` a `.env` **solo si no existe**. Conservar las
credenciales de M1. Registrar una cuenta TMDB y solicitar acceso desde
[Settings → API](https://www.themoviedb.org/settings/api), indicando estudiantes
de CC3116 de la Universidad del Valle de Guatemala y uso no comercial. No añadir
tarjeta. Elegir **API Read Access Token** y ponerlo sin prefijo `Bearer` en
`TMDB_READ_TOKEN`. [Autenticación oficial](https://developer.themoviedb.org/docs/authentication-application).

`MCP_TOKEN` es otro secreto: un token aleatorio compartido entre backend y MCP.
Puede generarse localmente con `python3 -c 'import secrets; print(secrets.token_urlsafe(32))'`
y copiarse a `.env`; no compartir la salida ni incluirla en reportes.

| Variable               | Valor por defecto / significado                                       |
| ---------------------- | --------------------------------------------------------------------- |
| `TMDB_READ_TOKEN`      | Vacío; solo servidor, nunca `VITE_*`                                  |
| `MCP_TOKEN`            | Vacío; arranque MCP rechazado si falta                                |
| `REDIS_URL`            | `redis://localhost:6379/0`; Compose usa el nombre interno `redis`     |
| `TMDB_DAILY_BUDGET`    | 1000, configurable entre 1 y 1000                                     |
| `CATALOG_CACHE_TTL`    | 3600 s, entre 1 y 86400                                               |
| `TMDB_TIMEOUT`         | 5 s por intento, máximo 10                                            |
| `TMDB_RETRIES`         | 1 reintento máximo, puede ser 0                                       |
| `MOVIES_ALLOWED_HOSTS` | JSON de hosts explícitos de infraestructura; loopback y `movies:8001` |

No hay URL de proveedor configurable desde usuario/modelo. Solo TMDB HTTPS y
rutas propias; query se codifica como parámetro. No se siguen redirects, no se
heredan proxies del entorno y no se colocan tokens en URLs. El SDK valida las
URLs de salida de nuevo en el consumidor M1; M4 debe hacerlo en el navegador.

## Arranque

Servicios completos de M1+M2, desde raíz:

```bash
npm run start:services
npm run dev:real
```

Backend `127.0.0.1:8000`, MCP `127.0.0.1:8001/mcp`, Redis `127.0.0.1:6379`.
No se crean automáticamente el MCP de libros ni funciones de M4. El backend
actual conserva fallos parciales cuando libros no está disponible.

Desarrollo sin contenedor MCP:

```bash
cd server
uv sync --frozen --python 3.12
PYTHONPATH=.:../mcp uv run --frozen --env-file ../.env uvicorn movies.main:app --factory --host 127.0.0.1 --port 8001 --no-access-log
```

`/health/live` no consume proveedores. `/health/ready` comprueba configuración y
Redis, **no acredita que el token TMDB sea válido**. Ninguna credencial es parte
del build; usuario de imagen no root y contexto de build por allowlist. Apagar
con `npm run stop:services`; no borrar volúmenes para detener los servicios.

## Cuota y caché para M3

`catalog_common.cache.CatalogCache(redis, provider, daily_limit, ttl)` puede
reutilizarse con namespace `google_books`. Separar cada proveedor; no usar claves
recibidas directamente del modelo. El adaptador debe llamar `take()` **antes de
cada intento HTTP**, también los reintentos. `get(key, fetch)` reutiliza caché y
reserva una sola consulta concurrente; el callback valida antes de guardar.

- La cuota se cuenta atómicamente con Lua usando la hora UTC de Redis; se reinicia
  a medianoche UTC, compartida por todos los procesos. Ante límites distintos entre réplicas, se
  conserva el menor durante el resto del día. Caché y cuota persisten si
  Redis persiste; perder/restaurar una copia antigua puede perder consumo real.
- Caché de datos normalizados, sin tokens/URLs de solicitud; TTL acotado. Lock con
  propietario y expiración, recheck tras adquirirlo y espera máxima de dos segundos.
  Al vencer la espera, `catalog_busy` evita duplicar upstream.
- TTL de lock 60 s: cualquier callback reutilizado por M3 debe estar acotado por
  debajo de ese tiempo. TMDB limita cada intento y MCP limita el total a 12 s.
- Conexión Redis fallida implica error cerrado; no se consulta gratis al proveedor.
- Solo se reintenta una vez ante timeout/transporte o 502/503/504. Cada intento
  cuenta. 401/403 no se reintentan; 429 activa cooldown compartido y se respeta
  `Retry-After` numérico/HTTP-date, acotado a un día. Consultas ya cacheadas pueden
  seguir funcionando durante cuota/cooldown.
- 1,000/día es presupuesto interno del curso, **no cuota oficial vigente de TMDB**.
  [Política de rate limiting del proveedor](https://developer.themoviedb.org/docs/rate-limiting).

## Errores MCP e integración con M1

`isError=true`, contenido/structuredContent con
`{"error":{"code":"quota_exhausted","retryable":true,"retryAfter":60}}`.
Códigos: `invalid_arguments`, `unknown_tool`, `unsupported_genre`,
`invalid_provider_result`, `provider_not_configured`, `provider_unavailable`,
`provider_timeout`, `provider_rate_limited`, `quota_exhausted`, `catalog_busy`,
`storage_unavailable`. No hay texto de excepción, input o credenciales.

La salida exitosa conserva el schema v1. En errores, M1 solo acepta los códigos
revisados de cuota/rate limit (HTTP 429) y timeout (504); los demás se normalizan a
su fallo público de proveedor. Nunca reenvía mensajes arbitrarios de un MCP.
La distinción adicional no cambia el schema de `ChatResponse` o sus clientes viejos.

## Pruebas y medición

```bash
docker compose -p sofia-m2-test -f server/compose.test.yaml up -d --wait
npm run check:python
```

Esto cubre M1, contratos, M2 y utilidades compartidas con ≥80% por archivo en
líneas/sentencias, funciones y ramas. HTTPX simula solo la frontera TMDB; las
pruebas de cuota usan Redis real e incluyen dos procesos, y un cliente MCP HTTP
independiente verifica el transporte real. No leen `.env` ni consumen free tiers.

Ensayo de carga offline, **sin TMDB ni LLM**:

```bash
cd server
PYTHONPATH=.:../mcp uv run --frozen python -m movies.benchmark --requests 40 --concurrency 8
```

Reporta p50/p95, errores y consultas de proveedor simulado para dos clientes de
caché en un proceso. No es un benchmark de la API conversacional completa ni prueba
de alta disponibilidad. Dos procesos separados también prueban la cuota global.

Probe real acotado, con servicios arrancados y registro académico completado:

```bash
cd server
PYTHONPATH=.:../mcp uv run --frozen python -m movies.probe --confirm-academic
```

Usa el cliente MCP de M1 y un ID de película conocido; imprime solo éxito, ID y
presencia de póster/IMDb. Como máximo dos caché misses (detalle/configuración),
con el reintento configurado: hasta cuatro intentos HTTP. No consume LLM ni prueba
la presentación visual del widget. Las corridas reales se registran en
[IMPLEMENTACION.md](IMPLEMENTACION.md).

## Atribución para M4

Usar logo aprobado de [TMDB](https://www.themoviedb.org/about/logos-attribution)
sin alterar y con menor prominencia que AGIChat, enlace a TMDB y sección Créditos.
Aviso requerido: “This product uses the TMDB API but is not endorsed or certified
by TMDB.” Verificar [manual/FAQ oficial](https://developer.themoviedb.org/docs/faq)
al preparar la entrega. No se descargaron logos ni se modificó la UI de Créditos
en M2; su implementación sigue siendo de M4. La clave académica no autoriza
una futura explotación comercial sin revisar condiciones.
