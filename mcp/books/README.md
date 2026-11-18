# MCP de Google Books — M3.1 a M3.3

Servidor MCP Streamable HTTP en `/mcp`, puerto local 8002. Expone
`search_books(query, limit=3)`, `book_details(bookId)` y
`adaptation_evidence(movieId)` usando los modelos de `sofia.models`, schemas
canónicos y `validate_result`. M3.3 aporta premisas revisadas y comparación acotada
en el agente central existente; evals M3.4 y presentación enriquecida M4 pendientes.

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
La colección contiene cinco películas y cuatro obras:

| Película                                 | ID TMDB | Novela                                                      | Fuente editorial revisada                                                                   |
| ---------------------------------------- | ------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Dune (2021)                              | 438631  | Dune, Frank Herbert (1965)                                  | [Hachette/Orion](https://books.google.com/books?id=rXYdGATpigsC)                            |
| Dune: Part Two (2024)                    | 693134  | Dune, Frank Herbert (1965)                                  | [Misma descripción; nombra ambas películas](https://books.google.com/books?id=rXYdGATpigsC) |
| Jurassic Park (1993)                     | 329     | Jurassic Park, Michael Crichton (1990)                      | [Arrow Books](https://books.google.com/books?id=5cbLswEACAAJ)                               |
| The Hobbit: An Unexpected Journey (2012) | 49051   | The Hobbit, J. R. R. Tolkien (1937)                         | [HarperCollins](https://books.google.com/books?id=lBxrjgEACAAJ)                             |
| Blade Runner (1982)                      | 78      | Do Androids Dream of Electric Sheep?, Philip K. Dick (1968) | [Random House/Google Books](https://books.google.com/books?id=3vExWrUnJB0C)                 |

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

## M3.3: cómo se comparan las obras

Incluir una película significa añadir un registro revisado al JSON, no copiar una
respuesta de chatbot. `originalTitle` identifica la película y `bookTitle` la novela;
pueden ser distintos. El ID exacto selecciona ese vínculo y Google Books se consulta
por el título **del libro** y su autor. Los alias permiten traducciones y reediciones
retituladas; un homónimo de otro autor se rechaza. Blade Runner usa precisamente
esta ruta para buscar Do Androids Dream of Electric Sheep?, de Philip K. Dick.

Cada registro añade como máximo dos `comparisonEvidence`: `Premisa del libro: ...`
y `Premisa de la película: ...`, parafraseadas de una descripción editorial de Google
Books y una sinopsis IMDb, respectivamente. Se revisaron las fichas IMDb de
[Dune](https://www.imdb.com/title/tt1160419/), [Dune: Part Two](https://www.imdb.com/title/tt15239678/),
[Jurassic Park](https://www.imdb.com/title/tt0107290/), [The Hobbit](https://www.imdb.com/title/tt0903624/)
y [Blade Runner](https://www.imdb.com/title/tt0083658/). La novela individual The Hobbit
usa [su descripción editorial](https://books.google.com/books?id=fMn8ugAACAAJ),
separada del estuche que documenta el vínculo. No se consultan ni extraen notas IMDb.

La tool añade esas premisas a `Adaptation.evidence` solo cuando verifica el libro.
Se conserva el contrato existente: `Evidence.statement`, `Evidence.source`,
`Adaptation.limitations` y `Comparison.verdict`; no hay campos nuevos que rompan
consumidores estrictos. Los prefijos identifican el medio, no son instrucciones.

`server/sofia/comparison.py` presenta identidad, premisas, fuentes y alcance. Con
ambas premisas emite una orientación subjetiva condicional: puede valer la pena si
interesa esa premisa, sin afirmar fidelidad ni superioridad. Si solo se conoce el
vínculo o falta una premisa, declara datos parciales y no inventa un juicio.
Incertidumbre, ausencia de cobertura y error del proveedor siguen siendo distintos.
No se comparan escenas, finales, calidad de actuación ni diferencias no documentadas;
no se usa una sinopsis como sustituto de lectura íntegra.

El agente central de M1 usa esa presentación. El seguimiento «Compara esa película
con su libro sin spoilers» exige una película seleccionada y hace una llamada MCP,
sin inferencia LLM. Las peticiones con un título nuevo conservan la selección de
herramientas del agente; su prosa libre tampoco sustituye las premisas verificadas.
No se crea un segundo agente. Esta ruta determinista no acredita seguridad del
modelo: las evals funcionales/adversariales reales siguen pendientes de M3.4.

### Probar sin el token TMDB de M2

Con `books`, `backend` y Redis reconstruidos/arrancados:

```bash
docker compose --env-file .env -p sofia -f infra/compose.yaml up --build -d --wait redis books backend
docker compose --env-file .env -p sofia -f infra/compose.yaml exec backend .venv/bin/python -m scripts.probe_comparison --confirm-no-billing --reviewed-movie
```

Este modo usa la identidad revisada Blade Runner (1982), ID 78, y el agente/MCP de
producción con Google Books real. Informa `mode: reviewed_movie_live_books`, el
origen de los metadatos y consumo LLM cero. No consulta TMDB ni crea una sesión HTTP,
y deshabilita el LLM para impedir llamadas accidentales. No representa el flujo
completo del widget. Con `--title "Dune 2021" --movie-id 438631` se prueba otro caso.

### Probar el recorrido HTTP completo

Requiere `TMDB_READ_TOKEN` configurado por el operador y el servicio `movies`
funcionando, además de Books/backend/Redis. No compartir credenciales en el chat.
Desde raíz:

```bash
docker compose --env-file .env -p sofia -f infra/compose.yaml exec backend .venv/bin/python -m scripts.probe_comparison --confirm-no-billing
```

Crea su propia sesión, selecciona Blade Runner por el chat HTTP, pide comparar,
imprime solo resultado público y elimina esa sesión con su token. En el widget el
equivalente es «Blade Runner 1982» y luego «Compara esa película con su libro sin
spoilers», en modo real y con el backend actualizado. La presentación de tarjetas
enriquecidas y apertura de referencias sigue a cargo de M4.

### Fixtures para M4

`docs/integration/fixtures/m3-comparison-*.json` contiene cuatro ejemplos marcados
`synthetic_fixture`: válido, parcial, incierto y sin evidencia. El cuerpo HTTP está
en `response`; todos validan contra el schema y runtime existentes. M4 puede probar
estados antes de tener servicios/proveedores disponibles. `confirmed` confirma el
vínculo, no garantiza que haya evidencia suficiente para recomendar frente al libro.

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

## Verificación M3.3 del 17/11/2026

- **375 tests Python aprobados**, 49 nuevos frente a M3.2. Ruff lint/formato,
  mypy (32 archivos), contratos sin divergencia y cuatro métricas por archivo
  aprobados. `sofia/comparison.py` y resolver alcanzan 100% en las cuatro;
  `agent.py` conserva 96.08% líneas/sentencias, 89.81% ramas y 100% funciones.
- Cuatro fixtures para M4 validados con JSON Schema y Pydantic. Cubren relación
  confirmada con datos suficientes, relación confirmada con datos parciales,
  edición incierta y ausencia de cobertura. Las peticiones comparativas reconocidas
  exigen evidencia obtenida en el turno; no se reutiliza un veredicto anterior.
  La cobertura de paráfrasis y resistencia del modelo se medirá en M3.4.
- Books y backend reconstruidos. Prueba real del agente/Books con identidad de
  película revisada: Blade Runner y Dune (2021) confirmadas con ambas premisas;
  Dune (1984) devuelve insuficiencia limitada a la colección. Google Books devuelve
  la novela Do Androids Dream of Electric Sheep? para Blade Runner, demostrando
  títulos distintos. Consumo LLM cero. No se consultó TMDB ni se creó sesión HTTP.
- Evidencia: [comparación](../../docs/evidence/m3/comparison-check.json),
  [calidad y hash](../../docs/evidence/m3/quality-m33-summary.json),
  [checks frontend](../../docs/evidence/m3/frontend-m33-check.json).
- En esa verificación aún faltaba `TMDB_READ_TOKEN`: no se acreditó selección
  TMDB, recorrido HTTP ni navegador. Ver la actualización integrada posterior.
- Se ejecutaron los checks generales exigidos: npm lint pasa; formato global
  reporta archivos ajenos a M3.3; tests frontend 60 pasan/10 fallan por AbortSignal
  y timeout; E2E JSDOM falla por timeout; app/SDK fallan por TS2339 en
  `ChatHeader.test.tsx` líneas 48/67. Node local 24.22.1 frente al 22 documentado.
  No se modificó `src/`, no se rebajaron checks ni se afirma CI remoto verde.

### Actualización: recorrido integrado real

Con TMDB configurado, el widget real permitió seleccionar Blade Runner (1982)
y compararla con Do Androids Dream of Electric Sheep?, sin MSW ni fixtures.
También se verificaron por HTTP Dune (2021), confirmada, y Dune (1984), fuera
de cobertura de la colección. El backend devuelve el póster y fuentes; el
cliente actual presenta solo texto y aún no ejecuta acciones de navegación.
Este recorrido no requiere inferencia LLM y no cierra las evals OWASP reales.
Ver [pasos manuales](../../docs/integration/prueba-manual-m3.md),
[resultado del widget](../../docs/evidence/m3/widget-live-check.json) y
[captura](../../docs/evidence/m3/widget-live-comparison.png).

Ver [asignación](../../docs/delivery/miembro-3-libros-evals.md) y
[guía de integración](../../docs/integration/m3-libros-evals.md).
