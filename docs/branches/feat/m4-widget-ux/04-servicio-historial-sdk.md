# Etapa 2: M4.1, servicio, historial y SDK

Inicio: 17/11/2026. Cierre de revisión local: 18/11/2026.
Rama: `feat/m4-widget-ux`. Responsable: Arodi Chávez.

**Estado:** sesión organizada en seis commits locales por solicitud expresa del
usuario del 18/11/2026. Esta solicitud autoriza los commits de esta etapa pese
a la regla general de `AGENTS.md`. No se realiza push, PR, merge ni despliegue.

Este es el **único Markdown nuevo de la sesión**. Resume el trabajo completo y
detalla qué se realizó en cada commit; no se crea un documento por commit.
Los documentos de los tres commits anteriores se conservan como historial.

## Registro de commits de la sesión

El punto de partida es `40d33d8`. Los cinco primeros hashes ya se verificaron;
este documento se incorpora en el sexto, cuyo hash definitivo se consulta con
`git log -6 --oneline`. No se escribe su propio hash dentro del archivo porque
depende del contenido de este mismo documento.

### 1. `ad315be` — Contratos y validación

Mensaje: `feat(m4): derive and validate frontend chat contracts`.

Incluye el generador `scripts/generate-widget-contracts.mjs`, los tipos
`contracts.generated.ts`, los módulos `schemaValidation.ts` y
`responseValidation.ts`, y sus pruebas en `responseValidation.test.ts`.
Deriva tipos desde los schemas existentes, valida respuestas antiguas y
ampliadas y aplica las políticas de URL, IDs y evidencia. No modifica el
contrato publicado por M1. Es la base de los siguientes commits.

### 2. `07ab7d0` — Historial y estado de errores

Mensaje: `feat(m4): migrate and sanitize persisted chat history`.

Incluye `chatErrors.ts`, los cambios de tipos/store y `historyPersistence.ts`
con su prueba propia. Añade errores tipados, campos enriquecidos de mensajes,
versión de persistencia, migración y proyección de snapshots. Conserva el texto
anterior sin restaurar credenciales, solicitudes vivas ni acciones ejecutables.
Las pruebas cubren Unicode, límites, snapshots corruptos y versiones futuras.

### 3. `fc970b6` — Transporte HTTP

Mensaje: `feat(m4): bound chat requests and handle transport failures`.

Incluye `chatService.ts`, `httpSafety.ts`, la adaptación de `services/types.ts`
y `chatTransport.test.ts`. Añade timeout, límites de entrada/salida, lectura
JSON acotada, errores públicos seguros y validación de correspondencia de
solicitud. Conserva la sesión en memoria ligada a su endpoint y no introduce
reintentos automáticos ni consultas de prueba a proveedores reales.

### 4. `5cb6cec` — Envío y reinicio centralizados

Mensaje: `refactor(m4): centralize conversation submission and reset`.

Incluye `conversation.ts`, `ChatServiceContext.ts`, `useChat.ts`, la adaptación
del input y la cabecera y sus pruebas de servicio/componentes. Extrae la
orquestación de la UI, controla concurrencia y respuestas tardías, conserva
los datos de presentación y excluye las acciones del historial. Añade la
etiqueta del campo y el error asociado; elimina el estado «En línea» no verificado.

### 5. `d99abed` — SDK y modo de ejecución

Mensaje: `feat(m4): configure sdk backend and expose runtime mode`.

Incluye las props y el wrapper del SDK, `ChatModeContext.ts`, `runtimeMode.ts`,
la identificación de modo en `ChatWidget` y pruebas de configuración/runtime
y SDK HTTP. Permite configurar un backend confiable, cancelar peticiones al
desmontar/cambiar endpoint y verificar que no se reenvían credenciales al
destino nuevo. Conserva las posiciones y temas del SDK.

### 6. Integración de demos, modos y evidencia de sesión

Mensaje: `feat(m4): integrate safe demo flows and document session`.

Incluye `App.tsx`, `main.tsx`, `ScenarioButtons.tsx`, `DemoApp.tsx`, sus pruebas,
el flujo E2E ampliado y este documento único de sesión. Conecta los ejemplos
al envío centralizado, oculta controles simulados en modo real y carga MSW
solo desde el bootstrap de desarrollo cuando corresponde. Diferencia fallos
de escenarios de éxitos y documenta pruebas, consumo y límites. El E2E prueba
dos turnos, sesión y restauración sin ejecutar ni persistir navegación.

Cada porción incluye sus pruebas relevantes. La evidencia de la suite completa
corresponde al árbol final de código verificado antes de organizar los commits;
crear los commits no alteró ese código ni requirió repetir consultas externas.

## Objetivo y alcance

Preparar el frontend para consumir el contrato ampliado de M1 sin perder
compatibilidad con `{ response }`, y conservar los datos que usarán las futuras
fichas. Centralizar el envío antes de implementar presentación y navegación.

No se modificaron `shared/contracts/`, backend, MCP, dependencias, configuración
de CI ni scripts de `package.json`. Tampoco se efectuaron consultas reales a
TMDB, Google Books o al LLM. La evidencia utiliza fixtures sintéticos de M3,
MSW y dobles de `fetch`, sin acceso a proveedores.

## 1. Contrato: una fuente neutral

- `scripts/generate-widget-contracts.mjs` deriva los tipos TypeScript de los
  schemas HTTP publicados por M1. No publica ni modifica esos schemas.
- `src/services/contracts.generated.ts` contiene los tipos derivados. Los
  campos opcionales conservan su opcionalidad y admiten `null` donde corresponde.
- `src/services/types.ts` reexporta los tipos y conserva `IChatService` como
  frontera. `cancelPending` es opcional para mantener servicios antiguos compatibles.
- `schemaValidation.ts` valida estructura, campos extra, tipos, patrones,
  límites, referencias locales y uniones directamente contra los schemas JSON.
  Soporta deliberadamente solo el subconjunto presente en los schemas HTTP v1;
  no es un validador general de JSON Schema. Rechaza keywords desconocidas y
  limita la profundidad. Las pruebas recorren también nodos opcionales del schema
  para detectar ampliaciones incompatibles antes de integrar cambios de M1.
- `responseValidation.ts` añade las invariantes que no expresa el schema:
  host/ruta HTTPS exactos, IDs de película/libro correspondientes a sus URLs,
  rating con votos positivos, evidencia para adaptaciones confirmadas y
  correspondencia de IDs de acciones y solicitudes.

La validación no sigue URLs, redirecciones ni referencias de schemas remotos.
No inserta datos predeterminados inventados en las respuestas. Una respuesta
antigua válida sigue funcionando; una respuesta ampliada inválida falla de
forma explícita en lugar de convertir datos inseguros en contenido confiable.

Comandos para mantener los tipos:

```powershell
node scripts/generate-widget-contracts.mjs
npx.cmd prettier --write src/services/contracts.generated.ts
node scripts/generate-widget-contracts.mjs --check
```

La comprobación no se añadió a CI porque esa configuración corresponde a M2.
Propuesta para su revisión: ejecutar el último comando como check offline.

Referencia técnica consultada: [objetos JSON Schema](https://json-schema.org/understanding-json-schema/reference/object)
y [composición anyOf](https://json-schema.org/understanding-json-schema/reference/combining).

## 2. Transporte HTTP acotado

`HttpChatService` conserva la sesión opaca solo en memoria, ligada al endpoint
exacto que la emitió. Incluye `sessionId` en el cuerpo y `X-Session-Token` en la
cabecera cuando corresponde. No envía historial, roles ni credenciales de proveedores.

Cambios en `chatService.ts`, `httpSafety.ts` y `chatErrors.ts`:

- Timeout predeterminado de 65 segundos, aplicado también a la lectura del cuerpo.
  El valor puede inyectarse en el constructor y debe ser finito y positivo.
  Coordinarlo si M1 cambia el timeout del turno del backend.
- Cuerpo saliente máximo de 16 KiB y prompt de 1–4000 caracteres; validación
  previa a `fetch` para evitar consumir una consulta con una entrada inválida.
- Respuestas JSON hasta 256 KiB, controladas al leer el stream y por
  `Content-Length` si existe. La decodificación admite UTF-8 entre chunks.
- Sin reintentos automáticos, incluidos `429`, timeout o fallo de red.
- Errores tipados y mensajes locales seguros para sesión expirada, conflicto,
  validación, tamaño, cuota, indisponibilidad y timeout. No se muestra el texto
  arbitrario de una excepción ni del cuerpo de error del backend.
- `Retry-After` numérico se conserva como metadato del error; no activa reenvío.
- Rechazo de respuestas cuyo `requestId`, si existe, pertenece a otra solicitud.
- Una conversación reiniciada descarta respuestas tardías antes de adoptar sesión.
- Borrado remoto de sesión con timeout y sin redirecciones. Cancelación de un
  primer turno pendiente aunque todavía no exista una sesión emitida.

Abortar la espera HTTP no garantiza que el backend/proveedor detenga un trabajo
ya iniciado. Por ese motivo tampoco se reenvía automáticamente el mensaje.
No se afirma garantía de consumo exactamente una vez frente a fallos de red.

## 3. Un único camino de envío

`conversation.ts` implementa el envío y el reinicio; `useChat.ts` conecta esa
frontera con React y con un servicio configurable mediante contexto.

Se utilizan desde `ChatInput`, `ChatHeader`, `ScenarioButtons` y `DemoApp`:

- Bloqueo sincrónico de envíos simultáneos usando el estado actual de Zustand.
- Mensaje pendiente visible antes de esperar la respuesta.
- Actualización de entrega/error, indicador de espera y error público en el store.
- Comprobación de versión de conversación y del mensaje todavía pendiente antes
  de aplicar éxito o error. Un turno antiguo no desbloquea una conversación nueva.
- Conservación de `movies`, `comparison` y `sources` en `message.details`.
- Proyección explícita que excluye `actions`, IDs de solicitud/sesión y datos
  desconocidos del historial. Esta etapa no ejecuta ninguna acción de navegación.

El input conserva Enter/Shift+Enter y composición IME. Añade etiqueta visible
«Mensaje», IDs accesibles por instancia y asociación del error con el campo.
Una entrada demasiado larga conserva el borrador y explica el problema sin
enviar una solicitud. Los fallos se mantienen visibles y no disparan reintentos.

## 4. Historial versionado

`historyPersistence.ts` y `useChatStore.ts` introducen versión 1:

- Migración de snapshots v0 conservando mensajes válidos anteriores.
- Estados `sending` restaurados como `error`, pues ya no existe su solicitud viva.
- Validación y proyección tanto en migración como en merge y persistencia actual.
- Solo se persisten mensajes y sus datos enriquecidos válidos. Credenciales,
  flags de envío, errores y estado ejecutable no se restauran desde localStorage.
- Límite de persistencia de 100 mensajes recientes y aproximadamente 1 MiB de
  payload de mensajes codificado en UTF-8, más la envoltura JSON.
- Versiones futuras no comprendidas se descartan de forma conservadora.

Tras una recarga, los mensajes guardados son historial visual; sin credencial
en memoria el siguiente turno inicia sesión nueva. No se reenvía el historial
como instrucciones al backend. Los límites de persistencia no cambian los
límites y la expiración del historial del servidor, que custodia M1.

## 5. SDK y selección de modo

Nuevo prop opcional del SDK, compatible con los integradores actuales:

```tsx
<AGIChatWidget apiEndpoint="https://backend-del-equipo.example/api/chat" />
```

El dominio del ejemplo es ilustrativo; no se ofrece un backend desplegado.
El endpoint es configuración confiable del integrador y debe terminar en
`/chat`; se admite HTTPS remoto o HTTP en loopback para desarrollo, y se
rechazan credenciales embebidas, queries, fragmentos y esquemas peligrosos.
El borrado de sesión utiliza la ruta hermana `/session/{id}`.

El SDK no inicia MSW. Al desmontarlo o cambiar su endpoint se cancela su
solicitud pendiente. Las pruebas cubren configuración, sesión, reset, cambio de
endpoint y desmontaje, conservando posiciones y temas existentes.

Se mantiene la arquitectura actual de una conversación global en Zustand:
esta etapa no promete aislamiento entre múltiples widgets montados a la vez.

En la aplicación de desarrollo, `VITE_CHAT_MODE=mock` activa simulación y
`real` no la inicia. Si no se configura, desarrollo conserva el default mock
para evitar llamadas accidentales; producción opera en real y nunca inicia MSW.
El bootstrap importa los mocks dinámicamente solo cuando corresponde.

El widget indica el modo configurado sin afirmar disponibilidad. Los botones
de demostración se ocultan en real; la demo identifica simulaciones y su estado
de error. La cabecera ya no muestra «En línea» sin comprobarlo.

Para revisar sin consumir proveedores, en PowerShell:

```powershell
$env:VITE_CHAT_MODE='mock'
npm.cmd run dev -- --host 127.0.0.1 --open false
```

No se cambió el `.env` del usuario. Tampoco se activó modo real para hacer probes.
En GitHub Pages el SDK puede configurar un backend HTTPS; Pages sirve el cliente
estático y no ejecuta el backend. No se cambió ni ejecutó un despliegue en esta etapa.

## Verificación y pendientes

Resultados locales:

| Comando                                              | Resultado                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `npm run test:coverage`                              | 213 pruebas en 23 archivos, aprobadas                          |
| `npm run test:e2e`                                   | 2 flujos JSDOM/MSW aprobados; sin navegador ni proveedor real  |
| `npm run lint`                                       | Aprobado                                                       |
| `npm run build`                                      | Aprobado; advertencia de Vite sobre tamaño del bundle          |
| `npm run build:sdk`                                  | Aprobado; formatos ES/UMD y declaraciones TypeScript           |
| `node scripts/generate-widget-contracts.mjs --check` | Tipos derivados coinciden con los schemas                      |
| Formato de archivos de esta etapa                    | Aprobado                                                       |
| `git diff --check`                                   | Aprobado                                                       |
| `npm run format:check`                               | Falla por 54 archivos preexistentes que esta etapa no modifica |

Cobertura: sentencias **97.30%**, ramas **96.99%**, funciones **96.96%**,
líneas **97.72%**. No se cambian umbrales ni exclusiones. Las pruebas cubren
los cuatro fixtures de comparación de M3, formas antiguas/nuevas, errores,
límites, Unicode, migración, sesión, SDK y flujo integrado. El escenario E2E
nuevo comprueba dos turnos, token en cabecera, respuesta enriquecida,
rehidratación sin credencial ni acciones y ausencia de apertura de pestañas.

Consumo de APIs de películas, libros y LLM durante esta etapa: **cero**.

La herramienta de navegador no encontró un host disponible. No se presentan
capturas ni pruebas JSDOM como evidencia de layout o pestañas reales.

Continúan pendientes:

- Revisión cruzada de M1 del consumidor de contrato y coordinación de scripts
  de CI con M2. No se modifica unilateralmente su schema ni configuración.
- Validación con backend/proveedores reales mediante un número mínimo de turnos
  acordado para la integración final. Los tests offline no cierran ese requisito.
- M4.2: renderizado de fichas, pósteres, comparación y fuentes, incluyendo gráfico
  Google junto a resultados y enlace de cada volumen. Los Créditos de la etapa 1
  se conservan y no sustituyen esa atribución.
- M4.3: detección de intención, autorización y deduplicación de navegación,
  manejo de bloqueo y prueba en navegador real. No se envía `navigationIntent`
  ni se abre ninguna pestaña en esta etapa.
- Demo visual final, capturas por tamaño/tema y evidencia integrada M4.4.

No se marcan como cerrados los criterios globales de M4.1 mientras falte la
integración real y la revisión humana.
