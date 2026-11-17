# Probar M3 desde el chatbot real

El recorrido de comparación ya se verificó mediante el widget en Edge, con
servicios TMDB/Google Books reales y sin MSW. Ver la
[captura](../evidence/m3/widget-live-comparison.png), el
[resultado del navegador](../evidence/m3/widget-live-check.json) y los
[tres casos HTTP](../evidence/m3/http-live-check.json).

## 1. Preparar los servicios

Abrir Docker Desktop y esperar a que indique que está iniciado. Abrir PowerShell
en la raíz del repositorio: `C:\UVG\AI selectivo\Proy1-IA\Proyecto_1_AIEC`.
El archivo `.env` debe contener `TMDB_READ_TOKEN`, `GOOGLE_BOOKS_API_KEY`,
`NVIDIA_API_KEY` y `MCP_TOKEN`. No pegar sus valores en el chat ni subir el archivo.

```powershell
docker compose --env-file .env -p sofia -f infra/compose.yaml up --build -d --wait redis movies books backend
docker compose --env-file .env -p sofia -f infra/compose.yaml ps
```

El primer comando construye e inicia Redis, el backend y ambos MCP. También
aplica los valores actuales de `.env` a los contenedores. Los cuatro servicios
deben indicar `Up`/`healthy`. Si alguno termina o está `unhealthy`, resolverlo
antes de probar la interfaz. Cambiar `.env` sin recrear los servicios no actualiza
las credenciales de los contenedores existentes.

## 2. Iniciar la interfaz en modo real

En otra terminal PowerShell, en la misma raíz:

```powershell
$env:VITE_CHAT_MODE = 'real'
npm run dev
```

Dejar esa terminal abierta. Abrir <http://localhost:3000/>. Este comando configura
la variable solo en esa terminal y evita las respuestas simuladas de MSW.
El script actual `npm run dev:real` usa sintaxis de asignación de Bash; en
PowerShell utilizar los dos comandos anteriores.

Si ya había otro Vite en el puerto 3000, detenerlo con Ctrl+C en su terminal
antes de iniciar este. En la sesión de comprobación el servidor se dejó en
3000; si ya está disponible en modo real, basta abrir la dirección.

Si antes se utilizó modo mock y continúan respuestas simuladas, abrir DevTools
(F12), Application → Service Workers y desregistrar únicamente el worker de este
sitio local; recargar. Se puede inspeccionar Network para comprobar que los
POST `/api/chat` alcanzan el backend. No compartir cabeceras `X-Session-Token`.

## 3. Recorrido principal de tu parte

Abrir el botón del chat. Pulsar **Reiniciar chat** para iniciar una conversación
sin contexto anterior; el historial visible puede persistir tras recargar.
Enviar los mensajes uno a uno, esperando cada respuesta:

| Mensaje                                          | Resultado esperado                                                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `Hola`                                           | Se presenta y anuncia que puede comparar películas con sus libros.                                                           |
| `Blade Runner 1982`                              | Selecciona Blade Runner (1982), con información de TMDB.                                                                     |
| `Compara esa película con su libro sin spoilers` | Identifica Do Androids Dream of Electric Sheep?, de Philip K. Dick; presenta ambas premisas, valoración subjetiva y límites. |

Este caso demuestra que el título de la película puede ser distinto al del libro.
El año del libro devuelto puede corresponder a una reedición; la respuesta debe
distinguirlo del año original de la obra (1968). No exigir siempre el mismo ID
de edición de Google Books, pues la búsqueda y sus resultados pueden variar.

No hace falta abrir la consola ni escribir comandos dentro del chatbot para
probar este recorrido. La interfaz envía los mensajes al backend; este invoca
las herramientas MCP y conserva la película seleccionada en la sesión.

## 4. Casos adicionales

Reiniciar el chat entre casos y enviar cada pareja de mensajes:

| Selección   | Seguimiento                                      | Resultado esperado                                                                                      |
| ----------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `Dune 2021` | `Compara esa película con su libro sin spoilers` | Dune, de Frank Herbert; adaptación confirmada y comparación de premisas.                                |
| `Dune 1984` | `Compara esa película con su libro sin spoilers` | No hay evidencia en nuestra colección revisada para esa película. No equivale a que no exista un libro. |

La colección tiene cinco películas y cuatro novelas. No descubre automáticamente
todas las adaptaciones del cine. `Dune 1984` sirve como caso fuera de cobertura,
aunque la película sí procede de una novela. Para ampliar cobertura se revisa
y añade el vínculo en `mcp/books/adaptations.json`.

## 5. Qué se puede demostrar actualmente

| Elemento                                                                   | Estado                                                                                                                  |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Selección TMDB → sesión HTTP → MCP Books → comparación en texto del widget | Verificado con servicios reales.                                                                                        |
| Libro de título diferente, premisas y valoración con límites               | Visible en el chat y verificado.                                                                                        |
| Fuentes y póster estructurados                                             | El backend los devuelve; el widget actual solo conserva/muestra el texto.                                               |
| Tarjetas de película/libro, lista visible de fuentes y póster              | Integración de M4 pendiente.                                                                                            |
| Abrir IMDb/Google Books en pestaña sin clic en enlace                      | M4 pendiente: el cliente actual no envía `navigationIntent` ni ejecuta `actions`. Escribir «abre» por sí solo no basta. |
| M3.4: tres corridas adversariales del modelo real                          | Pendientes; esta prueba funcional no las sustituye.                                                                     |

La selección por título y el seguimiento comparativo usan rutas productivas
deterministas y pueden consumir cero inferencias LLM. Sí consultan los servicios
de catálogo reales (o sus cachés productivas). No afirmar que este recorrido
prueba inferencia NVIDIA ni resistencia del modelo a ataques.

## 6. Prueba equivalente por terminal y diagnóstico

Para aislar errores del widget, con los servicios iniciados:

```powershell
docker compose --env-file .env -p sofia -f infra/compose.yaml exec backend .venv/bin/python -m scripts.probe_comparison --confirm-no-billing
```

Este comando realiza selección y comparación mediante `/api/chat` y elimina
su propia sesión. Debe mostrar `ok: true`, `mode: live_http_comparison`,
`adaptationStatus: confirmed` y `testSessionDeleted: true`. No usar
`--reviewed-movie` para acreditar TMDB: ese modo anterior omite su consulta.

Ante un error de envío, revisar Network → `/api/chat` → Response. Los códigos
públicos distinguen proveedor no disponible, credencial inválida, cuota y sesión.
No compartir `.env`, cuerpos privados de proveedores ni tokens de sesión.

Al terminar la comprobación automatizada se borraron las sesiones creadas.
Los servicios de desarrollo y la interfaz se dejaron iniciados para la prueba
manual. Para detenerlos posteriormente:

```powershell
docker compose --env-file .env -p sofia -f infra/compose.yaml stop
```

Detener también Vite con Ctrl+C en su terminal si se inició manualmente.
