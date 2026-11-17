# Miembro 3 — Pedro Caso: libros MCP, evidencia y evals

Avance M3.1–M3.3 (17/11/2026): búsqueda, detalles, vínculo y premisas revisadas
implementados; cinco películas/cuatro novelas, incluida Blade Runner con título de
libro diferente. M3.3 integra presentación acotada y veredicto condicional en el
agente M1 existente, sin otro agente ni cambios de contrato. Ver
[operación y límites](../../mcp/books/README.md) y
[fixtures para M4](../integration/fixtures/).
La prueba Agent/MCP/Google real usa identidad de película revisada; falta
`TMDB_READ_TOKEN` para acreditar selección TMDB/HTTP completa. M3.4 dispone de
runner, 22 casos y reportes offline; su cierre real y el widget siguen abiertos.

## Contexto y meta

Leer reglas, plan, `docs/delivery/reutilizacion-a2a.md` y `docs/delivery/reutilizacion-evals.md`. El sistema debe comparar una película con el libro del que se adapta y justificar si vale la pena verla. Google Books ofrece catálogo y descripciones, no garantiza prueba de adaptación ni texto íntegro. Tu meta es aportar herramientas y evidencias confiables y un proceso de evaluación que mida el comportamiento real del agente.

Carga: 16 puntos. Propiedad: `mcp/books/`, sus pruebas y `evals/`. M1 redacta la comparación final con tu evidencia; M4 la presenta. Cada compañero aporta sus casos; tú mantienes el runner y reporte común, no asumes todos sus tests.

## Punto de partida actualizado de M2

Antes de implementar, leer la [guía de integración para M3](../integration/m3-libros-evals.md).
Contiene los contratos reales de las tres tools, restricciones de fuentes,
metadatos TMDB nuevos, caché/cuota reutilizable, transporte y pasos para incluir
libros/evals en CI. M2 verificó 248 tests Python y 70 frontend; su evidencia no
acredita que el MCP de libros o el harness ya estén implementados.

Los cambios de M2 fueron subidos por Hugo; la rama local coincide con el tracking
`origin/feat/mcp` al revisar el 15/11/2026. Revisar esos cambios antes de integrar
la rama de M3. CI remoto, aprobación humana y protección de `main` no se infieren
del push. Mantener abiertos los criterios de M3 hasta obtener evidencia propia.

## Objetivos y tareas ordenadas

### M3.1 — Servidor MCP de libros (4 puntos)

- Exponer búsqueda y detalles de libros con schemas acordados, resultados estructurados y fuentes. Recuperar ID, título, autores, fecha si existe, descripción disponible y URL de Google Books validada.
- Distinguir sin resultados, datos ausentes, proveedor caído y cuota. Reutilizar caché/presupuesto de M2 y patrón MCP revisado del repo A2A.
- Tests: éxito, vacío, proveedor malformado, timeout/429, URL no permitida. Comprobar invocación desde cliente MCP independiente.

### M3.2 — Relación película/libro (4 puntos)

- Combinar título original, autor, año y evidencia de adaptación disponible. La coincidencia de título es un candidato, no confirmación. Establecer `confirmed`, `uncertain`, `not_found` y error de proveedor como estados diferentes.
- Preparar una pequeña colección reproducible de adaptaciones con referencia verificable de procedencia; registrar título/autor/año y la fuente que confirma el vínculo. Si la API no lo prueba, usar una fuente pública revisada y citada, sin añadir scraping general por defecto.
- Tests: adaptación confirmada, homónimo incorrecto, múltiples ediciones, vínculo incierto y caso sin evidencia. No declarar «no hay libro» cuando solamente falló la API.

### M3.3 — Evidencias para comparar (3 puntos)

Implementación disponible en `server/sofia/comparison.py` y `Agent.run`, con
`comparisonEvidence` del catálogo y cuatro fixtures HTTP (válido/parcial/incierto/
sin evidencia). Solo se contrastan premisas y contexto bibliográfico; no se juzga
fidelidad ni se inventan escenas. El seguimiento de una película seleccionada
consume una llamada MCP y cero LLM. La ruta con selección del LLM usa el mismo
presentador y no acepta un veredicto comparativo sin evidencia.

- Definir con M1 dimensiones comparables respaldadas por los datos (premisa, enfoque, contexto y lo que realmente esté disponible). Diferenciar hecho, opinión y ausencia de evidencia.
- Proveer al agente fuentes y limitaciones; no inventar escenas, finales, citas o lectura íntegra. No descargar ni reproducir libros completos; extractos solo cuando estén permitidos y sean necesarios. Evitar spoilers por defecto.
- Tests y fixtures compartidos con M4: comparación válida, datos parciales e insuficiencia. La respuesta final corresponde al agente de M1, no duplicar otro agente sin justificación.

### M3.4 — Harness de evaluaciones (5 puntos)

Implementación en [evals](../../evals/README.md): ejecutor Python serial sobre
`Agent.run`, 10 casos funcionales/6 LLM01/6 LLM07, JSON/HTML y adaptador opcional
Promptfoo sin duplicar el agente. Modo offline sin claves; modo `real-model`
con `NvidiaLLM` y presupuesto Redis pero catálogo MCP sintético para inyecciones.
Ese segundo modo aún no se ha corrido como evidencia. El recorrido con servicios
reales y los efectos de navegador siguen pendientes por decisión del equipo.
No marcar cerrado este apartado por aprobar fixtures ni por configurar CI.

- Adaptar el patrón `agent_provider.py` + `promptfooconfig.yaml` de HDT6-IA-Evals como referencia principal; los archivos revisados son idénticos a los de HDT7, por lo que no se mantienen dos harnesses. Seguir `docs/delivery/reutilizacion-evals.md` y usar del HDT7 el patrón de llamadas MCP, no los servicios locales de HDT6. Invocar el mismo turno/backend usado por el widget; registrar herramienta, argumentos sanitizados, resultados/efectos, latencia y consumo. Las evals de navegación verifican además efectos en navegador con M4.
- Dataset mínimo propuesto: 8 casos funcionales (recomendación, póster, anuncio de comparación, comparación confirmada, ambigüedad/ausencia, referencia IMDb, Google Books y fallo/cuota); 6 LLM01 (al menos 3 directos y 3 indirectos en datos MCP); 6 LLM07 (extracción directa, traducción/codificación y conversación de varios turnos). Asegurar variedad, no seis paráfrasis idénticas.
- Cada caso contiene ID, categoría/edición OWASP, entrada o fixture adversarial, expectativa, tools permitidas/prohibidas y evaluador. Usar canarios sintéticos, nunca secretos reales. No confundir el nombre público de una tool MCP con un secreto.
- Umbral interno inicial: 100% de invariantes deterministas de seguridad y ≥90% de casos funcionales por corrida. Ejecutar 3 repeticiones acotadas de la suite real, reportar denominadores, tasas por categoría y todos los fallos. Ajustar datos/configuración con revisión, nunca bajar el umbral para ocultar fallos. Estos números son criterios del equipo, no porcentajes exigidos por la rúbrica.
- Asserts deterministas para schemas, canarios, hosts, llamadas prohibidas y efectos. Juez LLM opcional para calidad subjetiva, con rúbrica/prompt versionados y costo separado; no usarlo como único juez de seguridad.
- Publicar comando, dataset, versión/hash, fecha, modelo/parámetros, semilla si aplica, modo mock/real, número de corridas, costos y reporte legible. No copiar las fechas fijas ni los casos FAQ/clima del repo anterior.

## Criterios de aceptación

- [x] Un cliente independiente consume el MCP de libros con fuentes/URLs válidas y errores tipados.
- [x] Una adaptación confirmada y un homónimo incorrecto producen estados correctos; se explican los límites de Google Books.
- [ ] El agente integrado compara con evidencia, no inventa contenido y da conclusión o incertidumbre útil.
- [ ] El runner ejecuta casos funcionales y ambas familias de ataques contra el agente real y verifica herramientas/efectos, no solo rechazo textual.
- [ ] Las pruebas deterministas pasan en CI sin red; la evidencia de eval real se distingue explícitamente de los dobles y no oculta fallos.
- [x] Código productivo actual del módulo ≥80% en las cuatro métricas y controles de formato/lint/tipos existentes de M2. Ampliar y volver a verificar al añadir M3.3/M3.4.

La implementación propia de M3.3 y su integración con el turno del agente están
verificadas; se conserva abierto el criterio integrado hasta probar selección
TMDB y presentación del widget reales con M1/M4. No cerrar con fixtures ni con la
identidad de película revisada usada en el probe de libros.

## Verificación y entrega

Con M1 verificar un flujo película → libro → evidencia → veredicto; con M4 mostrarlo en widget y abrir la referencia real. Ejecutar tests del MCP, cliente independiente y evals con presupuestos de M2. Registrar reporte sin prompts privados ni secretos y documentar qué no mide la suite.

**Parte completada:** MCP reutilizable, relación sustentada, comparación integrada y evals reproducibles con ataques LLM01/LLM07. Para defensa, explicar un caso exitoso, uno ambiguo, un ataque indirecto y qué implica una tasa de éxito finita. Debes conocer también el flujo general del widget y las cuotas. Commits y publicación los hace una persona.
