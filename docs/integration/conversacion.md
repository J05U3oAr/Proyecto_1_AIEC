# Conversación, selección de películas y sesión

## Problema y solución

Antes, el agente exigía una película verificada incluso para contestar «hola».
Además, el cliente enviaba cada mensaje sin la sesión emitida por el backend;
«2006» no podía referirse a los candidatos de «Cars». Buscar el texto literal
«Cars 2006» o «Shrek 1» tampoco garantizaba encontrar el título del catálogo.

`sofia/dialogue.py` clasifica saludos, capacidades y respuestas sociales comunes
antes del LLM. Esas respuestas no consultan proveedores ni devuelven tarjetas o
acciones anteriores, pero conservan el contexto. Las solicitudes explícitas de
código, extracción de instrucciones y tareas fuera del ámbito se rechazan.
La política de sistema y la validación de salida siguen aplicándose al camino LLM.

Los títulos breves se consultan mediante `search_movies`, con los mismos schemas,
validación de resultados y límites de herramientas. Se prefiere la coincidencia
exacta frente a secuelas o parodias. «Shrek 1» busca «Shrek»; título/año se
resuelven por campos verificados, con un único fallback acotado cuando hace falta.
Un título literal con números, como «Wonder Woman 1984», tiene prioridad sobre
interpretar ese número como año. Las selecciones por año, título u ordinal usan
los candidatos verificados de la sesión; las ambiguas piden aclaración.

Las fichas directas muestran título, año, géneros, duración en minutos, puntuación
y votos de TMDB, además de la sinopsis con texto escapado. El contrato `Movie`
incluye metadatos opcionales verificados; no contiene puntuaciones de IMDb.
La prosa del LLM sobre ratings/IMDb se sustituye por la ficha verificada.
El filtro no es una garantía universal contra alucinaciones o ataques; las evals
adversariales completas siguen siendo responsabilidad de M3.

## Cliente y seguridad de sesión

`HttpChatService` guarda ID/token/endpoint en Zustand, solo en memoria. El token
viaja en `X-Session-Token`, nunca en el prompt, URL o localStorage. Cada turno
envía `sessionId` y un `requestId` nuevo. No se reenvía el token a otro endpoint
ni se siguen redirecciones. Un 401 olvida la sesión sin reintentar el mensaje.

Reiniciar limpia el historial y la sesión local e intenta borrar la sesión remota.
Se abortan solicitudes antiguas y se descartan respuestas de generaciones
anteriores. Un fallo de borrado informa la expiración remota si el chat sigue
vacío; no interrumpe un turno nuevo ni recupera credenciales antiguas. El envío
concurrente se bloquea y Enter durante composición IME no envía el borrador.
La persistencia existente sigue guardando únicamente mensajes: recargar puede
mostrar el historial anterior, pero inicia una sesión nueva en el servidor.

## Verificación del 15 de noviembre de 2026

- Python: 223 tests; Ruff, formato, mypy, schemas y cobertura por archivo en las
  cuatro métricas pasan con el umbral de 80%, sin rebajarlo.
- Frontend: 70 tests, incluidos sesión, reset, errores tardíos, redirecciones y envío; lint,
  formato, cobertura, e2e JSDOM y compilaciones de aplicación/SDK.
- [Diez casos HTTP reales](../evidence/m2/dialogue-check.json), con backend,
  Redis y MCP/TMDB reales, sin MSW. Ambas sesiones de prueba se eliminaron.
  Estos casos no necesitaron inferencia LLM; la salida hostil del modelo se
  prueba con dobles y no se presenta como una eval real del proveedor.
- Navegador integrado, modo real: «hola», «Cars → 2006 → Cars 2006», «Shrek 1»,
  solicitud de código y capacidades. Se observó Cars (2006), Shrek (2001), saludo
  y rechazo adecuados. [Captura](../evidence/m2/dialogue-browser.jpg).

Esto corrige el flujo conversacional; no acredita MCP libros, navegación real
con acciones enriquecidas, protección absoluta frente a prompt injection ni el
cierre global de la entrega. Los resultados históricos M2 se conservan sin
sobrescribir sus fallos. Vite todavía advierte de un chunk de aplicación >500 kB.

## Ampliación: puntuación, géneros y duración

Se añaden `genres`, `runtime`, `tmdbRating` y `voteCount` opcionales al contrato
compartido y a los schemas generados de película, respuesta HTTP y resultado MCP.
Las sesiones antiguas siguen siendo válidas; al solicitar metadatos de un título
verificado incompleto, el agente consulta `movie_details`. La caché de respuestas
TMDB usa una nueva versión de clave, sin reiniciar ni ampliar la cuota diaria.

La puntuación muestra un decimal y la cantidad de votos de TMDB; solo se publica
si hay promedio válido entre 0 y 10 y votos positivos. Cero votos significa sin
puntuación verificada. Duración cero/nula se presenta como no disponible y los
géneros proceden de los nombres de detalles TMDB, sin mapas inventados.
No se consulta IMDb para obtener notas. Un error del proveedor se informa como
error, sin transformarlo en una afirmación de ausencia de datos.

Las peticiones «y su puntuación», «cuánto dura», «qué género tiene»,
«puntuación de Interstellar» y «Cars 2, qué puntuación tiene» mantienen o buscan
el título correspondiente. Con varios candidatos se pide selección.

Verificación posterior a la ampliación: **248 tests Python**, Ruff, formato,
mypy, schemas y cuatro métricas de cobertura por archivo ≥80%; **70 tests
frontend**, e2e JSDOM, lint, formato y builds de aplicación/SDK aprobados.
Persisten los avisos de tamaño de bundle de Vite. Las pruebas con dobles cubren
valores ausentes/inválidos, sesiones y caché antiguas, puntuaciones inventadas y
fallos del proveedor; no equivalen a evals adversariales reales del LLM.

[Registro HTTP real de siete casos](../evidence/m2/metadata-check.json): Cars 2 e
Interstellar con TMDB/MCP/Redis reales, sin MSW ni inferencia LLM para esos
recorridos. La sesión de prueba se eliminó. Los votos/promedios pueden cambiar
con el tiempo. [Captura del widget real](../evidence/m2/metadata-browser.jpg).
