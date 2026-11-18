# Miembro 4 — Arodi Chávez: widget, SDK, navegación y UX/UI

## Contexto y meta

Leer `AGENTS.md`, `DESIGN.md`, el plan y `docs/delivery/contexto-curso-rubrica.md`. El frontend/SDK ya existen y funcionan con respuestas de texto simuladas. Tu meta es que un usuario descubra películas, vea pósteres, entienda la comparación con libros y abra referencias desde la conversación, conservando accesibilidad y compatibilidad del SDK.

Carga: 16 puntos. Propiedad: `src/services/`, `src/store/`, `src/hooks/`, componentes, SDK, demo, mocks, CSS/Tailwind, pruebas frontend y navegador. Coordinar contratos con M1 y scripts/dependencias con M2. Las llamadas a proveedores y credenciales no pertenecen al frontend.

## Objetivos y tareas ordenadas

### M4.1 — Integración del servicio, store y SDK (4 puntos)

- Extender `IChatService` con contrato validado de M1, conservar `{ response }` y tratar campos enriquecidos como opcionales. Mover orquestación asíncrona pesada de `ChatInput` a hook/servicio.
- Mantener historial/estado de solicitud en Zustand, proteger contra doble envío y respuestas fuera de orden. Versionar persistencia para mensajes antiguos y no persistir acciones ejecutables ni secretos.
- Configurar backend del SDK y separar explícitamente modo mock/real. Hoy `main.tsx` activa MSW siempre en desarrollo; corregir la selección para que el backend real no sea interceptado accidentalmente.
- Tests: respuesta vieja/nueva, respuesta inválida, error/timeout, migración, sesión y SDK embebido. No romper posiciones ni temas existentes.

### M4.2 — Recomendación y comparación accesibles (4 puntos)

- Mostrar título/año, póster, motivo basado en preferencias y fuentes. Dar fallback si no hay imagen y reservar proporción para evitar saltos.
- Comparación legible en móvil: película/libro, vínculo confirmado o incertidumbre, diferencias respaldadas y conclusión. Evitar tablas anchas en widget compacto; spoilers detrás de una acción explícita si se incorporan.
- Presentar Sofía como IA y anunciar capacidad de comparar; permitir corrección («me refería a otra película»), conservar contexto reciente y explicar incertidumbre/errores. No prometer aprendizaje de preferencias que no existe.
- Tests: teclado, foco, vacío, carga, fallo parcial, sin libro, contenido largo y tema claro/oscuro/personalizado. Revisar capturas en 320/375/768/1440 px.

### M4.3 — Abrir referencias por intención conversacional (5 puntos)

- Hacer primero una prueba en navegador real de «Abre su ficha en IMDb» y «Abre el libro en Google Books». La entrega pide abrir pestaña sin clic en link; un `<a target="_blank">` por sí solo no cumple.
- Investigar/probar reserva de una sola pestaña en el gesto de envío cuando hay intención explícita, completar navegación solo tras recibir acción válida o documentar un entorno de permisos aceptado. Si un caso exige otro gesto o permiso, registrarlo y resolverlo temprano con el equipo; no ocultarlo detrás de un mock de `window.open`.
- Validar tipo/proveedor, ID de acción/solicitud, HTTPS, hostname exacto y ruta. Ejecutar una vez por solicitud autorizada; no reabrir al recargar, rehidratar, reintentar ni rerenderizar. Proteger relación con `opener` mediante un flujo compatible con la estrategia de reserva y probarlo; no asumir que todas las opciones devuelven un handle navegable.
- Ante rechazo/error cerrar reserva; ante bloqueo mostrar estado honesto y enlace seguro de respaldo. No abrir ventanas para recomendaciones normales ni por instrucciones incluidas en sinopsis.
- Tests: ambas referencias, bloqueo, URL/acción maliciosa, respuesta tardía, doble render, duplicado e historial restaurado. Validar apertura real en al menos un navegador documentado y reportar comportamiento de los otros que se prueben.

### M4.4 — Demo, créditos y evidencia integrada (3 puntos)

- Adaptar la demo existente al cine y libros sin rehacer una landing innecesaria. Separar indicadores de simulación y modo real; no mostrar éxito de backend ficticio.
- Añadir Créditos accesibles con logo oficial de TMDB sin alterar, enlace y aviso requerido. Verificar con M2 licencia/procedencia de imágenes/fuentes. Diferenciar opinión de Sofía y datos del proveedor.
- Crear evidencia E2E del flujo completo y de ambos destinos; el `test:e2e` actual es JSDOM, por lo que la prueba de navegador debe agregarse con un runner apropiado. Aportar casos del flujo al harness de M3.

## Criterios de aceptación

- [ ] Demo y SDK embebido conversan con el backend real sin perder la compatibilidad de texto, posiciones o temas.
- [ ] Una recomendación presenta póster real o fallback, motivo y fuentes; la comparación declara vínculo, evidencia y veredicto.
- [ ] Se identifica como IA y anuncia comparación; se puede corregir la elección y retomar «esa película».
- [ ] IMDb y Google Books se abren por orden conversacional sin clic en link en el entorno documentado; bloqueo/permisos quedan evidenciados.
- [ ] Navegación inválida o no solicitada se bloquea y ninguna restauración de historial reejecuta acciones.
- [ ] No hay desborde horizontal a 320 px; controles de 44 px, contraste, foco, lector de pantalla y reduced motion revisados.
- [ ] Créditos TMDB cumplen el manual; tests frontend ≥80% en las cuatro métricas, build de app y SDK correctos.

## Verificación y entrega

Ejecutar checks de `AGENTS.md`, `npm run test:e2e`, build SDK y pruebas nuevas de navegador. Entregar capturas por viewport/tema, versión de navegador y pasos reproducibles de apertura/bloqueo. No presentar un spy de `window.open` como prueba de pestaña abierta.

**Estado: flujo local integrado verificado.** El SDK compilado mostró el póster y la comparación con el backend, TMDB y Google Books reales. El backend emitió ambas acciones de referencia sobre la selección verificada (sin inferencia adicional) y Chromium abrió los destinos en pestañas con `window.opener` nulo. Pasaron axe y teclado en los tres temas, con capturas a 320/375/768/1440 px. Consulta [la evidencia M4.3](../branches/feat/m4-widget-ux/06-navegacion-referencias.md). Quedan pendientes la pasada manual con lector de pantalla y perfil habitual, la integración de pruebas en CI y la revisión cruzada.
