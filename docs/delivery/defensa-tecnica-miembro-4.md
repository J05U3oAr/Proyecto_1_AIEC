# AGIChat · Memoria técnica del miembro 4

**Responsable:** Arodi Chávez  
**Área:** widget de Sofía, SDK, navegación y experiencia de usuario  
**Rama revisada:** `feat/m4-widget-ux`, con `c1642b8` como último commit local observado

Este documento reúne el trabajo realizado para convertir el widget de la primera entrega en la interfaz de Sofía para cine y libros. Explica las decisiones de implementación, dónde se encuentran en el código y qué evidencia respalda cada una. También sirve como material de entrada para preparar una exposición o practicar preguntas de defensa.

## 1. Alcance y relación con el equipo

| Bloque                             | Trabajo de M4                                                                                        | Resultado que se puede demostrar                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| M4.1 · Servicio, estado y SDK      | Conectar el widget al servicio de chat, validar el contrato, conservar historial y configurar el SDK | La demo y el widget embebido comparten el flujo de conversación y pueden apuntar al backend |
| M4.2 · Recomendación y comparación | Convertir resultados estructurados en fichas accesibles y legibles                                   | Póster, metadatos, veredicto de adaptación, libro y fuentes dentro de la conversación       |
| M4.3 · Referencias                 | Ejecutar una orden conversacional con intención explícita, validación y control de pestañas          | Pedir IMDb o Google Books desde el chat y abrir la referencia correspondiente               |
| M4.4 · Demo y evidencia            | Créditos, escenarios de demostración, accesibilidad y pruebas                                        | Modos identificables, evidencias de Chromium y un recorrido reproducible                    |

El miembro 1 es responsable del agente, backend y contrato. El miembro 2 trabaja el catálogo de películas mediante MCP y la infraestructura. El miembro 3 trabaja el catálogo de libros, la evidencia de adaptación y las evaluaciones. El aporte principal de M4 es integrar esos resultados en una experiencia que la persona pueda usar. La rama también incluye ajustes puntuales en el backend para desbloquear esa integración. Se explican en el apartado 8.

## 2. Arquitectura del recorrido

```text
Persona → ChatInput → coordinador de conversación → IChatService → backend Sofía
                    ↕ Zustand / historial                    ↕ cliente MCP
                    ↓                                        ↓
          MessageBubble y fichas                    servicios de películas y libros
                    ↓                                        ↓
          navegación validada en navegador              TMDB y Google Books
```

React muestra mensajes y controla el formulario. Zustand conserva el estado del chat. El coordinador inicia y cierra cada turno. El servicio HTTP construye la petición, aplica límites y valida la respuesta. El backend decide qué recursos ha verificado. El navegador decide si una acción recibida puede usar la pestaña que el usuario autorizó al enviar el mensaje. Estas responsabilidades permiten probar cada etapa y localizar si un fallo viene del formulario, del transporte, del catálogo o de la navegación.

El widget usa su endpoint de chat para comunicarse con el agente. Las credenciales de los catálogos y el servicio MCP permanecen del lado servidor. El cliente puede mostrar un póster público o enlazar a una ficha pública ya validada. Así, consultar datos mediante una API con credenciales y mostrar un recurso público son operaciones distintas.

## 3. M4.1 · Contrato, transporte y conversación

### Contrato compartido y validación

El intercambio mínimo conserva `{ prompt }` → `{ response }`. Los campos enriquecidos permiten devolver, según el caso, películas, comparación, fuentes y acciones. Los tipos del navegador se derivan de los esquemas compartidos. Como TypeScript comprueba tipos durante la compilación, también se valida el JSON recibido en tiempo de ejecución. `schemaValidation.ts` comprueba la forma y `responseValidation.ts` añade verificaciones sobre URLs e identificadores de catálogo.

Por ejemplo, un texto que contiene una URL de IMDb todavía es un mensaje. Para abrir una pestaña hace falta una acción tipada, datos de catálogo coherentes y la orden explícita del turno. Mantener esos conceptos separados hace que las tarjetas y los enlaces se puedan mostrar en respuestas normales sin crear efectos de navegación.

### Límites y errores HTTP

`chatService.ts`, `httpSafety.ts` y `chatErrors.ts` aplican un máximo de 4 000 caracteres al prompt, 16 KiB al cuerpo saliente y 256 KiB al JSON de respuesta. El timeout predeterminado de 65 segundos contempla la lectura del cuerpo. La respuesta se valida antes de que la UI la use. Un HTTP fallido, una respuesta incompatible o un timeout se convierten en estados de error que el chat puede mostrar. No hay reintentos automáticos que dupliquen consultas a los proveedores o acciones de un turno.

### Coordinación y persistencia

`conversation.ts` concentra el envío y el reinicio. Registra el mensaje de la persona, inicia la espera, entrega la petición al servicio y comprueba que el turno siga vigente al recibir la respuesta. Si la persona limpia o reinicia el chat durante la espera, una respuesta tardía no vuelve a llenar la conversación ni puede abrir una referencia pendiente. `useChat.ts` expone este flujo a los componentes y `useChatStore.ts` gestiona el estado compartido.

`historyPersistence.ts` migra el historial a la versión 1, conserva texto y datos permitidos, descarta formatos incompatibles y limita el almacenamiento a 100 mensajes recientes y aproximadamente 1 MiB. Las acciones, sus identificadores ejecutables y los avisos de navegación quedan fuera del historial. Una recarga restaura el material de lectura y no repite la orden. El historial del navegador y la sesión que conserva el backend son dos niveles distintos.

### SDK y modos de ejecución

El SDK es el paquete embebible que permite colocar el widget en una página anfitriona. Su componente `AGIChatWidget` acepta `apiEndpoint`; la demo puede usar `VITE_CHAT_ENDPOINT`. Los endpoints admiten HTTPS remoto y HTTP en loopback para desarrollo. El modo real puede iniciarse en Windows con `npm.cmd run dev:real`, que usa el modo de Vite. El modo mock usa escenarios controlados para mostrar y probar estados sin depender del catálogo. El modo activo se identifica en la experiencia de demostración.

El build del SDK genera JavaScript y CSS para el anfitrión. `src/sdk/widget.css` y `scripts/scope-widget-css.mjs` acotan los estilos al widget, evitando que reglas de la app para `:root`, `body` o barras de desplazamiento afecten la página anfitriona. La comprobación `test:sdk-css` inspecciona el CSS construido. El SDK documenta una conversación compartida por página; este trabajo no aporta instancias de conversación aisladas para varios widgets en la misma página.

## 4. M4.2 · Fichas, comparación y presentación del chat

`MessageResults` escoge cómo presentar los datos enriquecidos de un turno. `MovieCard` muestra el resultado visual con póster y metadatos disponibles. Un póster ausente o que falla tiene un estado alternativo y no impide leer la ficha. `ComparisonCard` presenta la relación película–libro y su veredicto. Una adaptación confirmada, una relación incierta y la ausencia de evidencia se comunican de forma distinta. `ResultSources` permite consultar las fuentes devueltas sin confundir esos enlaces manuales con una orden de apertura automática.

`MessageBubble.tsx` coloca los mensajes de la persona a la derecha y las respuestas de Sofía a la izquierda, como en un chat. El texto se lee desde la izquierda dentro de ambas burbujas y las fichas siguen dentro de la respuesta de Sofía. Las superficies y el contraste usan los colores semánticos del widget. Los presets claro, oscuro y violeta tienen evidencia de layout en Chromium.

`MarkdownRenderer.tsx` presenta el texto con Markdown y restringe enlaces a las referencias permitidas de TMDB, IMDb y Google Books. Para imágenes admite los pósteres validados. Ante una URL fuera de la lista, conserva el contenido legible del enlace o el texto alternativo de la imagen. El texto del agente sirve para presentar información. El flujo de acciones usa los campos del contrato y su validación propia.

## 5. M4.3 · Qué pasa al escribir «Abre la ficha de esa película en IMDb»

1. **Interpretar la orden actual.** `navigationIntent.ts` reconoce un pedido directo con proveedor explícito. Normaliza acentos y admite formulaciones como «Ahora abre el libro en Google Books». Rechaza ejemplos citados, negaciones, condiciones, URLs pegadas y órdenes ambiguas con dos proveedores. Un fragmento de sinopsis o historial no otorga permiso.
2. **Reservar durante el gesto.** Cuando la persona pulsa Enviar o usa Enter, el coordinador intenta abrir una única pestaña `about:blank` en ese mismo gesto, antes de esperar HTTP. Esto conserva el contexto de interacción que el navegador usa para decidir sobre popups. `referenceNavigation.ts` comprueba que la pestaña quede aislada con `window.opener === null`.
3. **Solicitar la acción.** El servicio envía la intención junto con el identificador de solicitud. El backend aplica su propia autorización y busca la referencia en datos verificados de la sesión. Para el libro, la evidencia debe confirmar la adaptación y contener un libro utilizable.
4. **Vincular respuesta y recurso.** El navegador comprueba tipo `open_reference`, IDs, proveedor, URL permitida y coincidencia con el recurso del turno. Para IMDb comprueba que la película devuelta corresponda a esa URL. Para Google Books verifica que el libro coincida con la adaptación confirmada. La URL usa HTTPS y debe ajustarse a los hosts y patrones autorizados.
5. **Navegar una vez.** Si la reserva sigue abierta, en blanco y aislada, el código usa `location.replace` en esa misma pestaña. El ticket se consume una vez y existe memoria acotada de IDs ya usados. La reserva vence a los 70 segundos y también se cancela al reiniciar la conversación o al desmontar el widget.
6. **Responder ante bloqueos.** Si se bloqueó el popup y la referencia pasó la validación, `NavigationStatus` muestra un enlace de respaldo. Si la persona ya navegó manualmente la pestaña reservada, el widget deja intacto ese contenido. El aviso distingue el estado de la navegación solicitada de la carga efectiva de la página externa.

**Ejemplo de exposición.** «Al enviar la orden, la interfaz reserva una pestaña. El servidor responde con la ficha que corresponde a la conversación. Mi código comprueba que esa acción sea la que la persona acaba de pedir y usa la reserva una sola vez». Se puede mostrar luego que una recarga con historial no vuelve a abrir la referencia.

## 6. M4.4 · Interacción, accesibilidad, demo y créditos

- **Teclado y foco.** `ChatWidget`, `FloatingLauncher`, `ChatHeader` y `ChatInput` participan en la apertura, el foco inicial y el cierre con Escape. Al cerrar, el foco vuelve al botón que abre el widget. Las pruebas cubren la interacción por teclado y la navegación por los controles.
- **Lectura de estados.** El widget muestra espera, errores y resultado de navegación. Cuando detecta un comando de apertura, el input se asocia con una explicación del intento de reserva. El diseño mantiene los controles visibles y el panel dentro de pantallas estrechas.
- **Contraste y temas.** Se ajustaron los tokens semánticos, con pruebas de las combinaciones de color y evidencia visual en tres temas. Se conservó el diseño configurable del SDK.
- **Atribución.** `ProviderCredits` agrupa las referencias y avisos de proveedores. El widget incorpora la atribución y los recursos oficiales de TMDB, y presenta Google Books en sus fuentes y créditos. Para exponer, mostrar el panel de créditos y la procedencia de las fichas.
- **Demo.** La demo permite mostrar estados reproducibles. Los escenarios sintéticos, incluidos los de apertura, sirven para ensayar la UI y errores sin consultas reales. El modo real permite demostrar una selección verificada por el catálogo cuando el backend y los servicios están disponibles.

## 7. Evidencia y guion reproducible

| Capa                    | Qué se comprobó históricamente                                                                                                                                                                        | Alcance de la evidencia                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest y JSDOM          | Validadores, transporte, persistencia, contrato, interacción y recorridos simulados                                                                                                                   | Verifican lógica y efectos observados sobre dobles, sin pestañas Chromium reales                                                        |
| `test:browser`          | Tres recorridos históricos en Chromium: referencias, ausencia de repetición al restaurar, fallback en iframe y layout de 320 px con axe                                                               | Pestañas reales, respuestas de red interceptadas                                                                                        |
| `test:browser:external` | Apertura de sitios externos y `window.opener` nulo, con acción local controlada                                                                                                                       | Comprueba los destinos. Google Books redirigió a su dominio regional conservando el ID                                                  |
| `test:browser:live`     | SDK compilado, backend local, ficha y póster de Blade Runner, comparación confirmada y órdenes para ambos proveedores                                                                                 | Comprueba la integración con catálogos reales. La apertura directa usa una ruta determinista y el test puede consumir cuota de catálogo |
| Layout y accesibilidad  | 12 capturas en los temas claro, oscuro y violeta a 320, 375, 768 y 1440 px, revisión de foco y análisis axe                                                                                           | Evidencia automatizada de Chromium. Queda la prueba manual con lector de pantalla y perfil personal                                     |
| Build y cobertura       | Build de app y SDK, chequeo de estilos y lint ejecutados históricamente. Una corrida documentada registró 287 pruebas y 97.57% de sentencias, 96.73% de ramas, 97.66% de funciones y 98.15% de líneas | Cifras de esa sesión, no una nueva medición de la rama actual                                                                           |

### Demostración oral con backend real

Abrir el widget local. En la última comprobación previa a este documento, la app respondió en `http://127.0.0.1:4321/` y el backend en `http://127.0.0.1:8000/health/ready`. Si los servicios se detuvieron, seguir el README para iniciar Compose con el `.env` local del equipo y arrancar Vite en modo real. El puerto efectivo aparece en la salida de Vite. El enlace loopback funciona desde la computadora que ejecuta el proyecto.

1. Escribir «Háblame de Blade Runner de 1982». Mostrar la selección, el póster y la ficha de TMDB.
2. Escribir «Compárala con su libro sin spoilers». Mostrar la relación confirmada con _Do Androids Dream of Electric Sheep?_ y la fuente de Google Books.
3. Escribir «Abre la ficha de esa película en IMDb». Mostrar la nueva pestaña de la película y volver al chat.
4. Escribir «Ahora abre el libro en Google Books». Mostrar la nueva pestaña con el libro de la comparación.
5. Recargar el chat y comprobar que el historial no dispara de nuevo las aperturas. Cerrar el widget con Escape y observar el retorno del foco.

## 8. Ajustes al backend encontrados en la integración

Durante la integración, «Qué tal estás» podía entrar como fuera de alcance. Se amplió el reconocimiento del saludo en `server/sofia/dialogue.py`. También se añadió una ruta específica para recomendaciones por género basadas en libro. La ruta consulta un conjunto acotado de películas, verifica evidencia de adaptación dentro del presupuesto de herramientas y comunica incertidumbre o falta de confirmación cuando corresponde. Una búsqueda general puede devolver cero coincidencias verificadas entre las películas consultadas. La demostración usa una selección conocida para mostrar el recorrido positivo de principio a fin.

Se normalizaron alias de género como `Science Fiction` a `Ciencia ficción` para que las llamadas de búsqueda lleguen al catálogo en un formato utilizable. Al probar la apertura por contexto se observó además que un fallo de inferencia podía impedir una operación que ya tenía la selección verificada. `server/sofia/agent.py` pasó a resolver las órdenes directas compatibles contra esa selección y a emitir la acción usando la autorización del servidor. El prefijo «Ahora» se acepta en el cliente y en el backend. Las solicitudes que nombran una película nueva siguen su recorrido de búsqueda.

En CI, un job de backend se detuvo porque Ruff detectó una línea de 102 caracteres en el decorador de una prueba de IMDb. El commit `c1642b8` la dividió para ajustarse al límite de 100. La presencia de esa corrección en Git no acredita el resultado de una nueva corrida de GitHub Actions ni la aprobación del PR.

## 9. Trazabilidad por hitos

| Commits de referencia                                 | Cambios                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| `543d751`, `6f08771`, `40d33d8`                       | Recursos oficiales, componente de créditos e integración en el widget           |
| `ad315be`, `07ab7d0`, `fc970b6`, `5cb6cec`, `d99abed` | Contrato, persistencia, transporte, coordinación y configuración del SDK        |
| `f5db7fa`, `58b148d`, `8827daa`                       | Fichas de cine y libros, experiencia de lectura y escenarios demo               |
| `4526d75`, `ef44af8`, `2c2a664`                       | Intención, reserva de pestaña, ciclo conversacional y pruebas con fixtures      |
| `9d6d07c`, `3befddf`, `fe9ce7f`                       | Contraste, foco, tamaños pequeños y aislamiento del CSS                         |
| `2491f4e`, `20774cc`, `18b14f2`, `342d512`            | Ajustes de integración, Markdown seguro, burbujas y configuración del modo real |
| `c26e890`, `a44131b`, `c1642b8`                       | Pruebas de navegador/SDK, documentación y formato de la prueba backend          |

La evidencia principal corresponde al entorno local. El material revisado no acredita publicación en GitHub Pages ni un backend público. Pages puede servir el frontend estático, mientras el modo real de la versión publicada necesita un backend HTTPS accesible y configurado por el equipo.

## 10. Preguntas sugeridas para preparar la defensa

| Pregunta                                                 | Ideas que debe contener la respuesta                                                                                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿Qué hiciste personalmente?                              | Integración del widget y SDK, fichas, experiencia, navegación segura y pruebas. Delimitar el trabajo propio frente a los proveedores MCP y al agente del equipo. |
| ¿Por qué hay dos tipos de validación?                    | Los tipos ayudan durante el desarrollo. La validación en ejecución examina lo que realmente llega del servidor, incluidos URLs e identificadores.                |
| ¿Por qué reservas la pestaña antes de recibir respuesta? | El navegador decide sobre popups en el gesto de envío. La reserva conserva ese momento y queda en blanco hasta validar el destino.                               |
| ¿Por qué no se repite una apertura al recargar?          | Las acciones no se guardan en el historial, y la ejecución exige el ticket vigente del turno con intención explícita.                                            |
| ¿Qué ocurre con un libro sin relación confirmada?        | La interfaz comunica el estado de evidencia. Google Books solo se abre automáticamente si la acción coincide con un libro de una adaptación confirmada.          |
| ¿Qué demuestran las pruebas de navegador?                | Distinguir Chromium con red simulada, destinos públicos con respuesta controlada e integración real del SDK con backend y catálogos.                             |
| ¿Qué quedó por verificar?                                | Revisión cruzada, lector de pantalla, perfil personal del navegador y estado remoto de CI y publicación.                                                         |

**Instrucción para el agente que prepare la exposición.** Usa este documento para entregar una explicación en primera persona de 3–5 minutos, un guion breve de demostración y preguntas con respuestas. Empieza por el aporte visible, explica después el camino de una orden hasta la pestaña y termina con la evidencia y sus límites. Usa el ejemplo de Blade Runner. Presenta las cifras como resultados históricos y distingue el trabajo propio del backend y los MCP del equipo.

## Fuentes dentro del repositorio

- [Asignación y criterios del miembro 4](miembro-4-widget-ux.md) y [plan de entrega](plan.md).
- [Registro de sesiones y créditos](../branches/feat/m4-widget-ux/README.md), [servicio, historial y SDK](../branches/feat/m4-widget-ux/04-servicio-historial-sdk.md) y [fichas de cine y libros](../branches/feat/m4-widget-ux/05-fichas-cine-libros.md).
- [Navegación de referencias y resultados históricos de pruebas](../branches/feat/m4-widget-ux/06-navegacion-referencias.md).
- [Diseño de Sofía](../../DESIGN.md), [README operativo](../../README.md) y [pruebas de navegador](../../tests/browser/).
