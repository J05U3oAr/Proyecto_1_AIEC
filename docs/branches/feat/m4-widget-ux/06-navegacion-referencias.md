# Sesión M4.3: referencias por orden conversacional

Fecha: 18/11/2026. Responsable: Arodi Chávez. Rama: `feat/m4-widget-ux`.
Base: `8827daa`. Único Markdown nuevo de esta sesión.

**Estado: implementación y pruebas offline listas; apertura real pendiente.**
La herramienta CUA informó que el host de navegador no está disponible. Los
dobles de `Window` y JSDOM no demuestran permisos, apertura de una pestaña real,
llegada al sitio del proveedor ni aislamiento real de `opener`.

## Registro de commits

### 1. `4526d75`: intención, autorización y reserva

Mensaje: `feat(m4): validate and reserve explicit reference navigation`.

Incluye `navigationIntent.ts`, `referenceNavigation.ts` y sus pruebas propias.

- Reconoce una orden directa inicial, con proveedor explícito: IMDb o Google
  Books. Acepta variantes conservadoras en español/inglés y normaliza acentos.
- Se alinea con la gramática de M1 y añade rechazos conservadores para citas,
  comandos multilínea, negación, condiciones, URLs pegadas y dos proveedores.
  «Abre su ficha» sin proveedor no autoriza una pestaña; se debe reformular.
- Examina únicamente el prompt actual. Una sinopsis, respuesta o historial no
  se convierte en autorización de navegación.
- Reserva una sola ventana `about:blank` con destino `_blank`. Asigna
  `opener = null` y verifica ese valor antes de conservar el handle; no utiliza
  features `noopener` que pueden devolver un handle nulo e impedir completar
  la reserva. Si no se puede aislar, cierra la reserva cuando sigue en blanco.
- Valida estructura y URLs contra el contrato existente, tipo explícito
  `open_reference`, proveedor, IDs de acción/solicitud/recurso y coincidencia
  con el recurso de catálogo devuelto. Para IMDb exige una sola película con
  esa URL; para Google Books, adaptación confirmada y libro coincidente.
- El ticket solo se consume una vez. Los IDs de acción usados se recuerdan
  en memoria con límite de 1024; la correlación con el request nuevo y el
  ticket vigente impide ejecutar acciones de respuestas anteriores.
- Navega mediante `location.replace` solo después de validar. La reserva
  debe seguir abierta, en blanco y aislada. Si el usuario la navegó a otro
  sitio, no se sobrescribe ni se cierra ese contenido manual.
- La reserva vence a los 70 segundos. Rechazo, cancelación y expiración
  impiden que una respuesta posterior vuelva a utilizar el ticket.
- Un bloqueo/cierre/fallo de navegación produce un enlace de respaldo solo
  si la acción recibida pasó las validaciones. No se reintenta `window.open`.

Los tests cubren ambos proveedores, bloqueo, excepciones, handle cerrado o
navegado por el usuario, opener no aislable, rechazo de destinos/IDs/tipos,
acción duplicada, cancelación y respuesta tardía.

### 2. `ef44af8`: integración con conversación, HTTP y SDK

Mensaje: `feat(m4): connect reference actions to the conversation lifecycle`.

Incluye la integración de servicio/store/SDK, `NavigationStatus`, los cambios
del input, el fixture local de navegación y pruebas de lifecycle/UI/transporte.

- Extiende `IChatService.sendMessage` con un argumento opcional compatible:
  `requestId` y `navigationIntent`. Los envíos normales siguen usando un solo
  argumento; los servicios antiguos pueden seguir devolviendo texto.
- El coordinador genera un ID, reserva la pestaña sincrónicamente durante el
  gesto de envío y después espera HTTP. El mismo ID e intención viajan al
  backend. El servicio comprueba que la intención coincida con el prompt.
- La acción se completa en el camino de envío, antes de marcar el turno como
  terminado. Ningún efecto de render de React abre ventanas.
- Reiniciar o limpiar la conversación cierra inmediatamente una reserva
  pendiente. El SDK también la cancela al desmontarse o cambiar de endpoint.
- Los cambios de versión/mensaje vigente rechazan efectos tardíos. Se
  conservan los timeouts y la ausencia de reintentos automáticos de M4.1.
- El input anuncia que se intentará reservar una pestaña cuando detecta la
  orden y asocia esa explicación al campo con `aria-describedby`.
- `navigationNotice` vive solo en memoria y muestra espera, rechazo, bloqueo,
  cancelación, expiración o solicitud de navegación enviada. No afirma que
  una página externa haya terminado de cargar.
- El enlace seguro de respaldo se puede usar por decisión del usuario y
  anuncia la nueva pestaña. Se valida de nuevo antes de renderizar.
- El historial sigue excluyendo acciones, IDs ejecutables y notices. Las
  fuentes normales conservadas como datos no se ejecutan al restaurarse.

`navigationFixture` hace una copia profunda de los datos sintéticos antes de
adaptarlos para no alterar los fixtures compartidos de M3. Sus destinos son
referencias públicas ya registradas en esos datos, no resultados de consultas
reales. En modo mock la selección está prefijada a Blade Runner y su libro;
no acredita que el agente haya elegido un recurso por contexto real.

### 3. Mock HTTP, recorridos integrados y documento de sesión

Mensaje: `feat(m4): finish offline reference flow and validation evidence`.

Incluye `mocks/handlers.ts`, el E2E ampliado, una comprobación estricta final
de caracteres del ID de acción (incluidos saltos de línea finales), su caso
adversarial y este documento único. Su hash
se consulta tras crearlo con `git log -3 --oneline`.

El handler mock responde a una intención coherente con el prompt usando el
fixture de referencia. El E2E recorre input → coordinador → HTTP simulado →
validación → navegación de un handle doble. Comprueba los dos destinos,
reserva previa a la respuesta, `opener` nulo y ausencia de acciones/notices
persistidos. No se considera evidencia de una pestaña abierta.

## Verificación local

| Comprobación            | Resultado                                                          |
| ----------------------- | ------------------------------------------------------------------ |
| `npm run test:coverage` | 287 pruebas aprobadas, 28 archivos                                 |
| `npm run test:e2e`      | 5 recorridos JSDOM/MSW aprobados                                   |
| `npm run lint`          | Aprobado                                                           |
| `npm run build`         | Aprobado; advertencia de tamaño del bundle                         |
| `npm run build:sdk`     | Aprobado, formatos ES/UMD y declaraciones                          |
| Tipos generados         | Coinciden con los schemas existentes                               |
| Formato de esta sesión  | Comprobado por separado con Prettier                               |
| `npm run format:check`  | Persisten avisos en 48 archivos preexistentes ajenos a esta sesión |
| `git diff --check`      | Sin errores de espacios                                            |

Cobertura: sentencias **97.57%**, ramas **96.73%**, funciones **97.66%** y
líneas **98.15%**. Sin cambios de umbral ni exclusiones.

**Cero consultas API a NVIDIA, TMDB y Google Books durante la sesión.** No se
inició backend real ni se ejecutaron evals contra un LLM. Consultas realizadas:
documentación pública y pruebas locales. Probar manualmente la apertura de
un sitio cargará esa página pública; el modo mock no llama a las APIs del agente.

## Prueba manual necesaria antes de cerrar M4.3

Iniciar la app en modo mock, sin cambiar el archivo del usuario:

```powershell
$env:VITE_CHAT_MODE='mock'
npm.cmd run dev -- --host 127.0.0.1 --open false
```

Abrir `http://127.0.0.1:3000/` y seguir este protocolo:

1. Registrar navegador y versión, sistema operativo, modo popup predeterminado
   y si el SDK está embebido en un iframe/sandbox.
2. Enviar «Abre su ficha en IMDb» con el botón Enviar. Comprobar una sola
   pestaña y el destino `https://www.imdb.com/title/tt0083658/`.
3. Enviar «Abre el libro en Google Books» usando Enter. Comprobar una sola
   pestaña y el destino `https://books.google.com/books?id=3vExWrUnJB0C`.
4. En la consola de la pestaña de destino, comprobar que `window.opener` es
   `null`. Registrar evidencia sin credenciales ni datos de sesión.
5. Repetir con popups bloqueados por la configuración normal del navegador:
   comprobar mensaje honesto y enlace válido, sin otra apertura automática.
6. Simular caída desde el escenario de error y enviar una orden de apertura:
   la reserva en blanco debe cerrarse. Repetir reiniciando durante la espera.
7. Recargar con historial, minimizar/expandir y volver a renderizar: ninguna
   pestaña debe reabrirse. Una recomendación o una negación tampoco abre.
8. Comprobar foco/lector de pantalla, ancho/altura de los avisos en móvil y
   comportamiento si se cierra o navega manualmente la reserva durante espera.

Si un navegador exige otro gesto o permiso, registrar la diferencia. El enlace
de respaldo no satisface por sí solo el requisito académico de abrir por orden
conversacional sin clic en link. No hay resultado de navegador real registrado
todavía. Para modo real, M1/M2/M3 deben entregar recursos de catálogo coherentes;
se mantiene pendiente la integración mínima y revisión cruzada con ellos.

## Fuentes, operación y límites

Se consultaron [MDN window.open](https://developer.mozilla.org/en-US/docs/Web/API/Window/open)
y [MDN window.opener](https://developer.mozilla.org/en-US/docs/Web/API/Window/opener).
La estrategia conserva el gesto inicial y trata el resultado de apertura como
dependiente del navegador. No cambia permisos del usuario ni intenta eludir
un bloqueo mediante bucles, ventanas adicionales o navegación arbitraria.

Se preserva el contrato de M1, incluida su autorización independiente en
`navigation_allowed`/`Agent.actions`. No se modifica backend, MCP, schemas,
dependencias o CI. El SDK mantiene la limitación documentada de una conversación
global por página; no se promete aislamiento de múltiples widgets simultáneos.

El trabajo se registra en commits locales según la solicitud de organización
incremental del usuario. Sin push, merge, PR, releases ni despliegue Pages en
esta sesión. Las claves permanecen en `.env`, ignorado por Git.
