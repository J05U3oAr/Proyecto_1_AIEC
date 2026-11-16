# DESIGN — Sofía, cine y libros en conversación

## Propósito y alcance

Guía común para todos los miembros y sus agentes. Leer junto con `AGENTS.md`, `INSTRUCTIONS.md` y `tasks/contexto-curso-rubrica.md`. Define la experiencia objetivo; **no indica que estos estilos o comportamientos ya estén implementados**. M4 custodia la implementación visual; M1/M2/M3 deben entregar los datos y estados necesarios, sin convertir decisiones del modelo en instrucciones de diseño.

Sofía ayuda a elegir una película según preferencias y a decidir si verla cuando adapta un libro. Debe permitir entender por qué la recomienda, corregir una elección y verificar referencias. Se conserva el widget embebible y el SDK de la primera entrega. La demo muestra el producto funcionando; no necesita una nueva landing de marketing.

## Dirección visual y decisiones

Concepto: **una conversación de cine con una ficha de recomendación como protagonista**. El póster aporta identidad y color; el marco del chat conserva el azul de AGIChat, superficies tranquilas y lectura clara. Evitar fondos cinematográficos detrás del texto, luces neón, glassmorphism, carruseles automáticos y una cuadrícula de tarjetas para todo.

Se revisaron las skills locales `frontend-design` y `ui-ux-pro-max`. La búsqueda de sistema visual devolvió un patrón genérico de landing; se descartó porque el producto es un widget conversacional. La búsqueda específica Theater/Cinema sugirió protagonismo de imágenes y tema oscuro: se aprovechan los pósteres y el soporte oscuro, sin imponerlo a todos los sitios anfitriones. Se conserva la paleta existente en vez de adoptar una paleta púrpura ajena al SDK. La guía React consultada contiene referencias a React 19; este proyecto conserva React 18 y no necesita actualizarlo para aplicar las recomendaciones generales de foco y pruebas por rol.

Dos variantes consideradas: catálogo de varias columnas y conversación con ficha destacada. Se elige la segunda por el ancho compacto, el historial existente y la necesidad de justificar una recomendación. El catálogo opcional no debe duplicar la navegación ni desplazar el chat.

## Tokens semánticos

Consolidar `tailwind.config.js` y `src/sdk/theme.ts`: hoy sus colores por defecto difieren. M4 debe reconciliarlos sin romper configuraciones existentes, con pruebas y una decisión documentada. Los siguientes son **valores objetivo**, no una orden de reemplazar overrides de clientes.

| Rol / variable del SDK          | Claro     | Oscuro    | Uso                              |
| ------------------------------- | --------- | --------- | -------------------------------- |
| `primary` / `--agichat-primary` | `#2563EB` | `#60A5FA` | Acción principal, foco y enlaces |
| `primaryContrast`               | `#FFFFFF` | `#0F172A` | Contenido sobre acción principal |
| `surface`                       | `#FFFFFF` | `#0F172A` | Panel principal                  |
| `surfaceMuted`                  | `#F1F5F9` | `#1E293B` | Respuesta, fondo secundario      |
| `text`                          | `#0F172A` | `#F8FAFC` | Texto principal                  |
| `textMuted`                     | `#475569` | `#CBD5E1` | Metadatos legibles               |
| `border`                        | `#64748B` | `#64748B` | Límite de controles perceptible  |
| `danger` (extensión semántica)  | `#B91C1C` | `#FCA5A5` | Error acompañado de texto        |

Usar un borde decorativo más suave solo donde no identifique un control. Extensiones de tokens del SDK deben ser opcionales con fallback; no obligar a clientes existentes a enviar colores nuevos. No usar color como única señal de error, carga o confirmación. Validar contraste de combinaciones reales, incluidos hover, disabled, foco y temas personalizados. Objetivos: 4.5:1 para texto normal, 3:1 para texto grande y elementos gráficos/controles relevantes. Los pósteres no determinan colores del texto.

Tipografía: una sola familia sans de interfaz, pila `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`, para integración liviana y sin descarga de fuentes adicional. Personalidad por el contenido/póster y jerarquía, no por títulos ornamentales. Cuerpo y textarea 16 px, interlineado 1.5; título de película 18–20 px semibold, encabezado del widget 18 px; metadatos/créditos 13–14 px. No usar texto de 10–11 px ni mayúsculas espaciadas. Texto alineado a la izquierda, hasta 65–75 caracteres por línea en vista expandida.

Espaciado: escala 4, 8, 12, 16, 24, 32 px. Padding del panel/input 16 px, separación entre mensajes 12–16 px. Radios por jerarquía: controles 8 px, fichas 12 px, panel 16 px, launcher circular. Una sombra suave en el panel; dentro, separar por espacio/divisores en vez de apilar sombras.

## Composición y responsive

```text
┌──────────────────────────────────────┐
│ Sofía · Asistente de IA    [−] [×]    │
│ Películas y libros                   │
├──────────────────────────────────────┤
│ Puedo recomendarte películas y        │
│ compararlas con sus libros.           │
│                                      │
│             Busco ciencia ficción.    │
│                                      │
│ [Póster] Título de película (año)      │
│          Por qué encaja contigo…      │
│          Fuente: TMDB                 │
│ [Comparar con el libro]               │
│                                      │
│ Comparación y conclusión…             │
│ Fuentes verificables                  │
├──────────────────────────────────────┤
│ Mensaje                              │
│ [Escribe a Sofía…           ] [Enviar]│
│ Créditos y fuentes                   │
└──────────────────────────────────────┘
```

- Vista compacta de referencia: 380 px de ancho y hasta 600 px de alto, limitada al espacio disponible. Nunca conservar 380 px fijos en un viewport menor. Margen lateral mínimo 12–16 px y altura basada en `dvh`/viewport disponible.
- En 320/375 px, panel de ancho disponible o vista de pantalla completa. Respetar áreas seguras y teclado virtual; el input no tapa el mensaje más reciente. Sin scroll horizontal del panel.
- Vista expandida hasta 800 px, texto con ancho de lectura limitado. Comparación en dos columnas solo cuando cabe; en móvil se apila por dimensión.
- Cabecera e input estables, lista de mensajes con scroll. Si el usuario lee mensajes anteriores, no forzar scroll al llegar una respuesta: ofrecer «Nueva respuesta». Al enviar, mostrar el mensaje propio y feedback inmediato.
- Launcher y controles no deben ocultar acciones críticas del sitio anfitrión. Conservar las cuatro posiciones del SDK y verificar cada una. Estilos del SDK acotados al widget para no alterar tipografía/scroll global del host.

## Reglas de contenido por componente

| Elemento              | Contenido y comportamiento                                                                                                                                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cabecera              | «Sofía», «Asistente de IA» y controles con nombre accesible. No usar «En línea» si no se comprueba disponibilidad real.                                                                                                                            |
| Bienvenida            | «Puedo recomendarte películas y compararlas con sus libros cuando exista una adaptación. ¿Qué te gustaría ver?» Añadir una limitación breve donde sea útil, sin repetir un disclaimer en cada mensaje.                                             |
| Sugerencias iniciales | Hasta tres ejemplos relevantes: «Ciencia ficción de menos de dos horas», «Una película basada en un libro», «Algo parecido a…». Editables o enviadas como una intención normal. No ejecutar navegación al seleccionarlas salvo petición explícita. |
| Ficha de película     | Póster, título/año, motivo breve ligado a preferencias y fuente. Máximo tres recomendaciones iniciales; priorizar una si el usuario pide una sola. No confundir puntuación del catálogo con certeza de la IA.                                      |
| Póster                | Proporción 2:3, ancho orientativo 96–120 px en compacto; reservar espacio. Alt «Póster de [título]» o vacío si es puramente redundante. Fallback «Póster no disponible», sin imagen rota ni póster generado como sustituto.                        |
| Comparación           | Identificar película y libro/autor, evidencia del vínculo, diferencias respaldadas y veredicto presentado como recomendación subjetiva. Si falta evidencia, indicarlo. No ocultar incertidumbre detrás de un porcentaje inventado.                 |
| Referencias           | Nombres explícitos «IMDb» y «Google Books». Informar que se abre otra pestaña. Enlaces clicables como respaldo y verificación; no sustituyen la apertura por orden conversacional.                                                                 |
| Input                 | Etiqueta visible «Mensaje», placeholder de ejemplo, textarea multilínea. Enter envía, Shift+Enter añade línea; respetar composición IME. Envío vacío bloqueado. Evitar doble envío y explicar si se espera la respuesta actual.                    |
| Créditos              | Acceso estable desde widget y demo, sin perder conversación. Logo oficial y atribución, fuente de datos y distinción entre datos y opinión de Sofía.                                                                                               |

No exponer «MCP», «tokens», «JSON», nombres de workers ni trazas en el flujo normal. Las fuentes son datos del producto; los detalles técnicos quedan en diagnósticos protegidos/documentación.

## Estados y recuperación

| Estado                           | Respuesta de interfaz                                                                                                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin conversación                 | Capacidades claras, ejemplos útiles y un campo listo para escribir.                                                                                                   |
| Consultando                      | Mensaje propio visible; estado real «Buscando películas…» si la aplicación conoce la etapa, o «Preparando respuesta…» si no. No inventar progreso ni tiempo restante. |
| Éxito                            | Recomendación con explicación; controles disponibles sin robar foco al usuario.                                                                                       |
| Sin resultados                   | «No encontré películas con esos filtros. Puedes cambiar el género o la duración». Conservar petición.                                                                 |
| Título ambiguo                   | Mostrar título/año de candidatos y pedir elección; no seleccionar arbitrariamente.                                                                                    |
| Libro incierto/no hallado        | Distinguir «No pude confirmar una adaptación» de «No pude consultar libros». Permitir seguir con la recomendación.                                                    |
| Proveedor/cuota                  | «No puedo consultar el catálogo ahora. Inténtalo más tarde». Dar reintento solo si corresponde; sin bucle automático ni inventar datos.                               |
| Póster fallido                   | Mantener tamaño reservado, texto y demás información; no bloquear respuesta completa.                                                                                 |
| Error de envío                   | Marcar mensaje fallido y permitir recuperación sin duplicar el turno o volver a abrir pestañas.                                                                       |
| Pestaña bloqueada                | «El navegador bloqueó la pestaña. Puedes permitirla o abrir la referencia aquí». Mostrar destino permitido y conservar conversación. No reportar apertura exitosa.    |
| Petición fuera de alcance/ataque | Explicar brevemente la capacidad disponible; no revelar prompts, reglas internas o secretos. Continuar permitiendo consultas válidas.                                 |

## Acciones del navegador

La navegación es una acción separada del renderizado. Una URL en Markdown, un póster o una sinopsis no la autoriza. Solo ejecutar una acción tipada validada y asociada al pedido explícito de abrir una referencia, con ID único y política de destinos. Validar también en el cliente, aunque el backend ya lo haya hecho.

Probar temprano el bloqueo de popups: una respuesta LLM llega de forma asíncrona y puede perder la activación del usuario. Si se reserva pestaña durante el gesto de envío, hacerlo solo para intención explícita de navegación, mostrar estado claro, completar con destino validado y cerrarla ante error/rechazo. Proteger `opener` sin romper la estrategia de reserva. No reservar una ventana por cada mensaje ni dos ventanas por un mismo gesto. Para dos destinos, gestionar pedidos separados o un flujo compatible probado.

La prueba de aceptación requiere apertura real de Google Books e IMDb sin clic en un enlace en el entorno documentado. Si el navegador exige permiso, declararlo y validarlo con el equipo/docente; el fallback no acredita el requisito. No reejecutar acciones desde historial restaurado, actualizaciones React o reintentos.

## Accesibilidad e interacción

- Controles de al menos 44 × 44 px, separación orientativa de 8 px, nombre accesible para iconos Lucide/SVG y foco visible de 2 px con offset suficiente.
- `aria-expanded` y `aria-controls` en launcher. Al abrir, foco útil dentro del panel; al cerrar, devolverlo al launcher. Escape cierra el panel, sin borrar la conversación.
- Si es panel no modal, no atrapar foco ni declarar `aria-modal`. Si una vista móvil es modal, implementar diálogo, foco contenido y fondo inerte de forma consistente.
- Historial con semántica de log y anuncio `polite` de nuevas respuestas; no releer toda la conversación ni anunciar cada token/punto animado. Usar alertas para errores pertinentes, evitando duplicación.
- Teclado para todas las acciones; no depender de hover, color, arrastre ni iconos sin texto alternativo. Mantener foco perceptible al llegar mensajes y al abrir Créditos.
- Respetar zoom al 200% y prueba de reflow a 320 px. Pósteres y tablas no desbordan el contenedor. No desactivar zoom.
- Transiciones breves de 150–220 ms para apertura y feedback. Respetar `prefers-reduced-motion`; sin pulsos infinitos decorativos, parallax ni entradas animadas en cada ficha. Un indicador de actividad tiene texto alternativo estable.

## Aplicación de las 18 guías HCI del curso

No todas exigen una función nueva: algunas se satisfacen con límites claros y comportamiento coherente. No añadir aprendizaje persistente ni analítica por cumplir una tabla.

| Guía                   | Aplicación y evidencia esperada                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| G1 Capacidades         | Bienvenida identifica recomendaciones, comparación y referencias.                                                         |
| G2 Límites             | Distinguir catálogo, opinión e incertidumbre; no simular lectura del libro.                                               |
| G3 Momento adecuado    | No abrir referencias ni interrumpir sin intención explícita.                                                              |
| G4 Relevancia          | Motivo ligado a filtros y memoria reciente, no un catálogo indiscriminado.                                                |
| G5 Normas sociales     | Español claro, fechas/títulos comprensibles, tono respetuoso y sin spoilers por defecto.                                  |
| G6 Sesgos              | No inferir género, edad u otros rasgos sensibles a partir de gustos; diversidad según preferencias explícitas.            |
| G7 Invocación          | Campo siempre reconocible, ejemplos y teclado.                                                                            |
| G8 Descartar           | Cerrar, ignorar sugerencias o rechazar una película sin perder control.                                                   |
| G9 Corregir            | «Me refería a la de 1984» actualiza selección, sin reiniciar innecesariamente.                                            |
| G10 Acotar dudas       | Pedir título/año o declarar que no se confirmó la adaptación.                                                             |
| G11 Explicar           | «La recomiendo por…», fuentes y motivo del veredicto. Sin revelar chain of thought ni prompt interno.                     |
| G12 Memoria reciente   | «Esa película» se resuelve por sesión; borrar conversación elimina ese contexto según política acordada.                  |
| G13 Personalización    | Preferencias expresadas durante la sesión. No afirmar que aprende a largo plazo si no existe ese mecanismo.               |
| G14 Cambios cautos     | Conservar contrato, historial y temas al ampliar UI/SDK.                                                                  |
| G15 Feedback granular  | Entender «más corta», «sin terror» o «otra versión»; botones adicionales son opcionales.                                  |
| G16 Consecuencias      | Aclarar si un ajuste aplica a esta búsqueda/sesión y si borrar historial afecta contexto servidor/local.                  |
| G17 Controles globales | Cerrar/expandir, limpiar conversación y configuración de tema disponible; no inventar un panel de vigilancia de datos.    |
| G18 Cambios            | Al incorporar comparación, anunciar la nueva capacidad de forma breve; documentar cambios del SDK sin avisos repetitivos. |

## Transparencia, fuentes y derechos

Identificar que Sofía es una IA. No presentar inferencias como información oficial de TMDB ni como reseñas humanas. Conservar procedencia de textos, imágenes y recursos; no copiar libros completos, reseñas extensas o assets sin permiso. El material del curso orienta decisiones del producto; no sustituye verificación jurídica ni términos vigentes. No incorporar bloqueos geográficos o afirmaciones legales solo porque aparecen en una diapositiva.

TMDB exige logo aprobado sin cambios y aviso en una sección tipo About/Credits. Añadir acceso visible a Créditos desde el widget y la demo, enlazar a TMDB y hacer el logo menos prominente que la marca de AGIChat. El aviso debe conservarse en su forma requerida; antes de implementarlo, comprobar el texto exacto en la [FAQ oficial](https://developer.themoviedb.org/docs/faq). El miembro 2 valida los recursos y M4 los presenta. La solicitud académica no autoriza uso comercial futuro sin revisar condiciones.

## Revisión antes de completar una parte visual

- [ ] Recomendación, comparación y fuentes legibles con contenido realista y títulos largos.
- [ ] Capturas en 320, 375, 768 y 1440 px, temas claro/oscuro y un tema personalizado válido; las cuatro posiciones no recortan panel.
- [ ] Contraste medido, teclado completo, foco/restauración y una revisión con lector de pantalla.
- [ ] Estados de carga, vacío, ambigüedad, cuota, error, póster faltante y popup bloqueado probados.
- [ ] Historial anterior sigue funcionando; acciones no se reejecutan al restaurarlo.
- [ ] Apertura real por conversación en ambos proveedores con evidencia y entorno documentado.
- [ ] MSW y backend real distinguibles; no hay secretos o detalles internos en UI/bundle.
- [ ] Créditos y procedencia de assets verificados; ninguna afirmación de respaldo de TMDB.
- [ ] Tests del componente, integración y build SDK pasan. Revisión humana antes de commit.

Referencias: skills locales `frontend-design` y `ui-ux-pro-max`; diapositivas CC3116 de experiencias IA partes 1/2 y contexto legal (páginas mapeadas en `tasks/contexto-curso-rubrica.md`); [MDN sobre apertura de ventanas](https://developer.mozilla.org/en-US/docs/Web/API/Window/open). No se modificó la interfaz como parte de la creación de esta guía.
