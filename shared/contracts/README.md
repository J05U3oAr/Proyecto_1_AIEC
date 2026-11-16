# Contratos v1 de Sofía

Estado: implementado por M1; M2 verificó las tools de películas sin cambiar los schemas.
Pendiente de revisión por M3/M4.
Los schemas JSON de `v1/` son el artefacto neutral para todos los consumidores.
Los validadores Python que los publican están en `server/sofia/models.py`.
No mantener tipos o schemas manuales divergentes: validar contra estos artefactos.

Desde `server/`: `uv run python -m sofia.contracts --check` detecta divergencias;
`uv run python -m sofia.contracts` publica cambios intencionales. Revisar cambios
de contrato con consumidores antes de usarlos. La versión 1 no usa streaming.

## HTTP

`POST /api/chat`, Content-Type `application/json`. Conserva `{ "prompt": "…" }`
y `{ "response": "…" }`; los demás campos son opcionales para clientes antiguos.
No se aceptan campos extra, historial ni roles del cliente. Prompt: 1–4000
caracteres sin espacios extremos; cuerpo máximo 16 KiB.

La primera respuesta devuelve `sessionId`, `requestId` y cabecera `X-Session-Token`.
Enviar en turnos siguientes **ambos**: `sessionId` en cuerpo y `X-Session-Token`
en cabecera. IDs no autorizan acceso; el token es una credencial opaca. No ponerlo
en URLs, logs ni Markdown. M4 decide su retención según el modelo de persistencia;
si falta tras recargar, iniciar sesión nueva conservando mensajes antiguos como
contenido visual, sin reenviarlos como instrucciones al backend.

Sin sesión se crea un contexto nuevo por solicitud, compatible con fase 1.
Expiración por inactividad: 30 minutos; historial: 20 mensajes. La expiración
devuelve 401. `DELETE /api/session/{sessionId}` con el token borra contexto y
deduplicación. Limpiar solo Zustand no borra la sesión del servidor.

`requestId` lo genera el cliente para reintentos, o el servidor si falta. Dentro
de una sesión, mismo ID/payload devuelve la respuesta completada; otro payload
devuelve 409. Una sesión ocupada devuelve 409. Se retienen los últimos 20 IDs;
fuera de esa ventana no se garantiza deduplicación. Un fallo no guarda un turno
parcial. Una sesión nueva que falla se elimina. No existe garantía exactly-once
de consultas externas frente a caída de proceso; las tools son de solo lectura.

`navigationIntent: { "provider": "imdb" | "google_books" }` significa que el
cliente detectó intención explícita de apertura en el mensaje actual. El servidor
también exige una orden directa al inicio (abre/abrir/ábreme/open), sin negación,
citas o fragmentos pegados, y usa solo IDs obtenidos del catálogo. Si no puede
autorizar, no genera acción. Esta gramática conservadora puede pedir reformular.
Nunca derivar este campo de una sinopsis, respuesta del agente o historial.

Acciones `open_reference`: M4 valida de nuevo HTTPS, host, ruta, recurso,
requestId y proveedor; ejecuta una vez por ID y nunca al restaurar historial.
Repetir una respuesta por idempotencia conserva los mismos IDs de acción.
Las pestañas y su bloqueo requieren prueba real de navegador de M4.

Errores públicos: `{ code, message, retryable, requestId }`, sin input ni trazas.
Estados: 401 sesión, 409 concurrencia/ID repetido, 413 tamaño, 422 validación/
política, 429 tráfico/cuota, 503 proveedor/almacenamiento, 504 timeout, 500 fallo
interno sanitizado. Respetar `Retry-After` si existe; no reintentar sin límite.

## MCP

Streamable HTTP en `/mcp`; endpoints de despliegue configurados por operador,
nunca por el usuario/modelo. Se rechazan redirecciones. HTTP sin TLS solo para
loopback y nombres internos `movies`/`books`; acceso remoto requiere HTTPS/token.
El operador debe fijar los destinos confiables de infraestructura.

| Tool                  | Servidor  | Entrada                              | Salida estructurada              |
| --------------------- | --------- | ------------------------------------ | -------------------------------- |
| `search_movies`       | películas | query, genre?, maxRuntime?, limit ≤5 | `{ movies: [...] }`              |
| `movie_details`       | películas | movieId                              | `{ movies: [película] }` o vacío |
| `search_books`        | libros    | query, limit ≤5                      | `{ books: [...] }`               |
| `book_details`        | libros    | bookId                               | `{ books: [libro] }` o vacío     |
| `adaptation_evidence` | libros    | movieId                              | `{ adaptation: {...} }`          |

Usar `structuredContent`, validado con `tool-result.schema.json`; no texto libre
como protocolo. Máximo 32 KiB de resultado y entradas según schemas por tool.
M1 verifica también correspondencia de IDs, tipo de resultado y límite solicitado.
Sin resultados no equivale a error: usar colección vacía o vínculo `not_found`.
`confirmed` requiere libro y evidencia con procedencia. Google Books por sí solo
no garantiza la adaptación ni lectura completa del libro.

Los schemas expresan estructura; validadores runtime añaden políticas de URL,
correspondencia entre IDs y evidencia requerida. Consumidores deben implementar
esas invariantes y usar fixtures adversariales, no confiar solo en JSON Schema.

M2/M3 usan errores MCP explícitos (`isError`), sin secretos ni excepciones
internas. M2 devuelve `structuredContent` con `{ error: { code, retryable, retryAfter } }`
cuando falla una tool. El consumidor M1 admite `quota_exhausted` y
`provider_rate_limited` como HTTP 429, y `provider_timeout` como 504; ignora
mensajes arbitrarios y normaliza los demás como fallo de proveedor. Esto no
cambia el schema de resultados exitosos ni de la respuesta HTTP pública.

## URLs admitidas

- TMDB: `https://www.themoviedb.org/movie/{id}`.
- Póster: `https://image.tmdb.org/t/p/{tamaño}/{archivo.jpg|png}`.
- IMDb: `https://www.imdb.com/title/tt{7–10 dígitos}/`.
- Google Books: `https://books.google.com/books?id={id}`.

Sin credenciales embebidas, fragmentos, hosts semejantes, esquemas alternativos,
query adicional o redirecciones. Normalizar URLs del proveedor antes de publicar.
