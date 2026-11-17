# MCP de Google Books — M3.1

Servidor MCP Streamable HTTP en `/mcp`, puerto local 8002. Expone
`search_books(query, limit=3)` y `book_details(bookId)` usando los modelos de
`sofia.models`, schemas canónicos y `validate_result`. `adaptation_evidence`
corresponde a M3.2 y todavía no se implementa.

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

## Verificación local del 17/11/2026

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

Ver [asignación](../../docs/delivery/miembro-3-libros-evals.md) y
[guía de integración](../../docs/integration/m3-libros-evals.md).
