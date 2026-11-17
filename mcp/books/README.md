# MCP de Google Books — M3.1 y M3.2

Servidor MCP Streamable HTTP en `/mcp`, puerto local 8002. Expone
`search_books(query, limit=3)`, `book_details(bookId)` y
`adaptation_evidence(movieId)` usando los modelos de `sofia.models`, schemas
canónicos y `validate_result`. Comparación/veredicto y evals siguen pendientes
de M3.3/M3.4 y su integración con M1/M4.

## Configurar la clave sin compartirla

Añadir manualmente al `.env` de la raíz, conservando las variables existentes:

```dotenv
GOOGLE_BOOKS_API_KEY=pegar_aqui_la_clave_real
GOOGLE_BOOKS_DAILY_BUDGET=1000
GOOGLE_BOOKS_TIMEOUT=5
GOOGLE_BOOKS_RETRIES=1
```

`.env` está ignorado por Git; `.env.example` contiene valores no secretos.
Cada integrante configura su clave o consume un backend compartido. No enviar
el archivo al equipo ni usar variables `VITE_*`. Compose inyecta la clave solo
al servicio `books`; `BooksSettings` la carga del entorno como `SecretStr`.
La clave se transmite en `X-Goog-Api-Key`, fuera de URL, caché y respuestas.
No activar logging de cabeceras ni imprimir `.env` o configuración expandida.

Mantener Books API como única API permitida. Antes de consultas reales,
comprobar que Google indique que el proyecto no tiene cuenta de facturación.
No registrar tarjetas, activar pagos ni vincular cuentas de facturación.

Referencias: [Books API](https://developers.google.com/books/docs/v1/using),
[clave en cabecera](https://docs.cloud.google.com/docs/authentication/api-keys-use),
[verificar facturación](https://docs.cloud.google.com/billing/docs/how-to/verify-billing-enabled).

## Arranque

Desde la raíz, con Docker y `MCP_TOKEN` privado configurado en `.env`:

```bash
docker compose --env-file .env -p sofia -f infra/compose.yaml up --build -d --wait redis books
```

Solo se publica `127.0.0.1:8002`. `/health/live` comprueba el proceso;
`/health/ready` exige clave configurada y Redis, sin llamar a Google ni validar
la credencial contra el proveedor. MCP requiere `Authorization: Bearer MCP_TOKEN`,
rechaza Origin de navegador, hosts ajenos y cuerpos mayores de 16 KiB.

Con uv/Python 3.12, alternativa desde `server/` y Redis local disponible:

```bash
uv sync --frozen --python 3.12
uv run --frozen uvicorn books.main:app --factory --app-dir ../mcp --env-file ../.env --host 127.0.0.1 --port 8002 --no-access-log
```

## Prueba real explícita y acotada

Con los servicios arrancados, desde la raíz:

```bash
docker compose --env-file .env -p sofia -f infra/compose.yaml exec books .venv/bin/python -m books.probe --confirm-no-billing
```

Usa el cliente MCP de producción para buscar Dune y consultar su detalle.
Hasta dos cache misses y cuatro intentos Google con el reintento habilitado;
cada intento consume presupuesto. Imprime estado, ID y código público de error.
No confirma adaptaciones ni equivale a una eval. La confirmación es una declaración
del operador; el probe no comprueba automáticamente la facturación de Google.

## M3.2: evidencia de adaptación

`adaptation_evidence(movieId)` usa IDs exactos y una colección revisada en
`adaptations.json`: versión, fecha de revisión, título original/año de película,
título/autores/año original de novela, afirmación parafraseada y fuente verificable.
La colección inicial contiene cuatro películas y tres obras:

| Película                                 | ID TMDB | Novela                                 | Fuente editorial revisada                                                                   |
| ---------------------------------------- | ------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| Dune (2021)                              | 438631  | Dune, Frank Herbert (1965)             | [Hachette/Orion](https://books.google.com/books?id=rXYdGATpigsC)                            |
| Dune: Part Two (2024)                    | 693134  | Dune, Frank Herbert (1965)             | [Misma descripción; nombra ambas películas](https://books.google.com/books?id=rXYdGATpigsC) |
| Jurassic Park (1993)                     | 329     | Jurassic Park, Michael Crichton (1990) | [Arrow Books](https://books.google.com/books?id=5cbLswEACAAJ)                               |
| The Hobbit: An Unexpected Journey (2012) | 49051   | The Hobbit, J. R. R. Tolkien (1937)    | [HarperCollins](https://books.google.com/books?id=lBxrjgEACAAJ)                             |

Las descripciones identifican expresamente esas relaciones. La fuente de Tolkien
es un estuche que documenta la adaptación; no se selecciona como novela individual.
Las fechas originales se contrastaron con [Abrams, Dune](https://www.abramsbooks.com/pdfs/press-releases/DUNEGraphicNovelACA.pdf),
[Knopf, Jurassic Park (1990)](https://books.google.com/books?id=4VzhAAAAMAAJ) y
[The Tolkien Estate](https://www.tolkienestate.com/writing/john-d-rateliff-the-hobbit/).
Estas son referencias bibliográficas; las fuentes emitidas por la tool conservan
los proveedores del contrato existente, sin ampliar schemas ni allowlists.

Se consulta Google Books por título/autor con hasta cinco candidatos y caché/cuota
M3.1. Se exige título entre alias revisados, autores compatibles y año de edición
no anterior a la obra. No se confirma mediante LLM ni texto recibido de la red.

| Resultado   | Significado                                                                 |
| ----------- | --------------------------------------------------------------------------- |
| `confirmed` | Evidencia revisada y edición compatible recuperada de Google Books.         |
| `uncertain` | La relación tiene evidencia, pero no se verificó una edición compatible.    |
| `not_found` | ID sin evidencia en la colección; no demuestra ausencia universal de libro. |
| Error MCP   | Falló proveedor/Redis/cuota/contrato; no se transforma en ausencia.         |

Se rechazan homónimos, otras obras y guías/estuches con títulos o autores distintos.
Entre ediciones válidas se elige por año conocido y luego ID, sin depender del orden
del proveedor. Las reediciones posteriores al estreno son válidas. Si falta el año
se conserva `null` y se informa; la fecha de edición no sustituye a la original.

La cobertura es finita: otras películas requieren añadir evidencia explícita revisada.
No añadir secuelas por suposición ni disfrazar fuentes externas como Google Books.
Al ampliar, conservar procedencia/fecha y actualizar pruebas. No hay scraping en
runtime ni copias de libros completos. Confirmar el vínculo no prueba diferencias
de escenas ni equivale a haber leído la obra.

### Prueba manual de M3.2

Reconstruir primero el servicio con el comando de arranque si estaba usando M3.1.
Desde raíz:

```bash
docker compose --env-file .env -p sofia -f infra/compose.yaml exec books .venv/bin/python -m books.probe --confirm-no-billing --movie-id 438631
```

Devuelve `ok`, `status`, libro, fuentes y limitaciones. `ok: true` significa consulta
completada; comprobar `status: confirmed` para una relación confirmada. Los otros IDs
de la tabla funcionan igual. `841` (Dune de 1984, fuera de la colección) devuelve
`not_found` limitado sin llamar a Google. Hasta un cache miss/dos intentos HTTP por
película revisada; ambas Dune comparten búsqueda. No equivale a una eval del LLM.

## Datos, errores y límites

- IDs y contratos validados; URL Google Books construida desde el ID. Se ignoran
  enlaces arbitrarios del proveedor y no se siguen redirecciones.
- Datos opcionales ausentes se representan como lista vacía, año null o texto vacío.
  Descripción convertida a texto plano y limitada a 4000 caracteres.
- Máximo cinco libros. Detalle 404 devuelve colección vacía. Respuesta malformada,
  ID incompatible, timeout o cuota son errores, nunca ausencia de libro.
- Hasta 1 MiB de respuesta HTTP y 32 KiB de resultado MCP; timeout de herramienta
  de 12 s y hasta un reintento por timeout/transporte o 502/503/504.
- Redis comparte caché/cuota con namespace `google_books`. Cada intento se contabiliza;
  cache hits no consumen cuota y pueden responder durante cooldown. Redis caído
  impide consultas sin contabilizar. No se cachean errores como resultados vacíos.
- 1000/día es presupuesto interno del curso, no cuota oficial vigente garantizada.
- HTTP 429 y 403 Google por cuota activan cooldown compartido. Clave inválida devuelve
  `provider_not_configured`. MCP usa `isError=true`, códigos sanitizados y nunca
  devuelve excepciones, cuerpos del proveedor ni credenciales.

## Pruebas

Desde raíz iniciar Redis aislado; desde `server/` ejecutar los checks:

```bash
docker compose -p sofia-m2-test -f infra/compose.test.yaml up -d --wait
cd server
make check
```

`mcp/tests/test_books.py` y `test_mcp_books.py` usan claves ficticias, HTTP Google
simulado, Redis real aislado y cliente MCP independiente sobre HTTP real.
No leen `.env` ni llaman Google. Cobertura, tipos y CI incluyen `mcp/books/`.
El job de contenedores usa claves sintéticas sin consultar proveedores.
La prueba real de búsqueda y detalle ya fue ejecutada; ver resultado al final.

## Historial de verificación M3.1 del 17/11/2026

- Suite Python completa: **291 pruebas aprobadas**, incluyendo cliente MCP HTTP
  independiente y consumidor `RemoteMCP` del backend. Ejecutada en una imagen
  temporal con fuentes y dependencias del lockfile, sin `.env` ni claves reales.
- Control de cuatro métricas por archivo aprobado. Adaptador Google Books:
  líneas/sentencias **96.55%**, ramas **95.24%**, funciones **100%**; los otros
  archivos productivos de libros alcanzan 100% en las cuatro métricas.
- Imagen `books.Dockerfile` construida. Servicio con clave sintética: live 200,
  ready 200 y llamada MCP sin token 401. Ninguna llamada a Google.
- Contratos sin divergencia y análisis inicial mypy aprobado en 29 archivos;
  Ruff pasó antes de ampliar el test de variables de ejemplo. El último intento
  de repetir formato/tipos Docker fue rechazado; no se afirma una repetición final.
- Formato de documentación/configuración modificada y diff sin errores verificados.
- La primera corrida sobre el volumen Windows obtuvo 285 aprobadas, un fallo del
  test de `.env.example` (actualizado para Books) y cinco timeouts de arranque MCP.
  La corrida final con copia de fuentes en filesystem Linux aprobó las 291 pruebas,
  sin aumentar timeouts ni reducir controles de las suites existentes.
- Checks generales frontend en el entorno local Node 24.22.1: lint aprobado;
  60 tests aprobados y 10 fallidos (AbortSignal y timeout). App/SDK detenidos por
  TS2339 en `src/test/components/ChatHeader.test.tsx`, líneas 48 y 67. Formato global
  reporta 67 archivos ajenos al cambio. No se modificó `src/` ni se acredita CI remoto.

Estos resultados prueban implementación y transporte con upstream simulado;
no acreditan Google Books real, adaptación confirmada ni comparación integrada.

### Comprobación posterior con Google Books real

El 17/11/2026, después de que el usuario configurara su clave y confirmara que el
proyecto no tiene facturación, se ejecutó el probe desde el contenedor `books`.
El primer arranque falló porque faltaba `MCP_TOKEN`; se generó un token local
aleatorio sin publicarlo y se recreó el servicio, que quedó Healthy.

Resultado del probe: `{"ok":true,"mode":"live_mcp_google_books","bookId":"JhJ7cgAACAAJ"}`.
Esto acredita búsqueda y detalles por el cliente MCP de producción usando Google
Books real. No acredita evidencia de adaptación, comparación ni integración del
widget. La clave y el token permanecen en `.env`, fuera de Git y de este reporte.

## Verificación M3.2 del 17/11/2026

- **326 tests Python aprobados** (35 casos nuevos), incluidos cliente MCP HTTP
  independiente y consumidor `RemoteMCP`. Cubren homónimos, autores ausentes,
  varias ediciones, incertidumbre, cronología, fuentes inválidas y fallos de API.
- Ruff lint/formato, mypy (30 archivos), contratos sin divergencia y las cuatro
  métricas por archivo aprobados. Resolver, transporte y probe: **100%** en las
  cuatro métricas. Adaptador Google: 96.55% líneas/sentencias, 95.24% ramas y
  100% funciones, sin bajar umbrales.
- Imagen reconstruida y servicio `books` Healthy. MCP/Google reales devolvieron
  cuatro adaptaciones `confirmed` y Dune (1984) `not_found` por cobertura limitada.
  Ver [resultados sanitizados](../../docs/evidence/m3/adaptation-check.json) y
  [resumen de calidad y hash de la colección](../../docs/evidence/m3/quality-summary.json).
- Libros recuperados: Dune `deRpPwAACAAJ`, Jurassic Park `V5s14nks9I8C`, The Hobbit
  `vnOIzwEACAAJ`. La fuente del vínculo puede ser otra edición o un estuche; el
  recurso seleccionado como libro es una edición compatible de la obra individual.
- No se ejecutó LLM ni se acredita comparación, diferencias de escenas, seguridad
  adversarial, integración visual o CI remoto. No se modificó `src/`; los fallos
  frontend del historial M3.1 no se declaran resueltos.

Ver [asignación](../../docs/delivery/miembro-3-libros-evals.md) y
[guía de integración](../../docs/integration/m3-libros-evals.md).
