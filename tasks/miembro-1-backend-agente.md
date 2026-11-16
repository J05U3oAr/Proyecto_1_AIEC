# Miembro 1 — Diego Calderón: backend, agente y contratos

## Contexto y meta

Leer `AGENTS.md`, `INSTRUCTIONS.md`, `DESIGN.md`, `tasks/plan.md` y `tasks/reutilizacion-a2a.md`. El widget ya consume `{ prompt }` → `{ response }`, pero no existe backend real. Tu meta es que Sofía converse desde el widget usando herramientas MCP reales, recomiende con fundamento y compare una adaptación sin inventar información. El backend aplica la seguridad aunque el modelo ignore sus instrucciones.

Carga estimada: 16 puntos. Carpetas propias: `server/`, `shared/contracts/`, pruebas asociadas y `ARQUITECTURA.md`. Coordinar scripts con M2; no editar el cliente/store de M4 para integrar a escondidas. Reutilizar patrones del A2A según el análisis; Python es una alternativa preferente si la prueba inicial reduce trabajo, manteniendo contratos neutrales al lenguaje.

Avance de implementación: [operación y pruebas](../server/README.md),
[contratos](../shared/contracts/README.md) y
[decisiones/evidencia/pendientes](../server/IMPLEMENTACION.md). Los criterios de
aceptación integrados permanecen abiertos hasta disponer de consumidores y
proveedores reales; no se marca completado por pruebas con dobles.

## Objetivos y tareas ordenadas

### M1.1 — Contrato y sesión (3 puntos)

- Publicar schemas HTTP/MCP y ejemplos válidos/erróneos del plan. Definir errores, IDs, límites y campos enriquecidos opcionales; conservar clientes de texto de la fase 1.
- Definir sesión opaca con expiración, aislamiento entre clientes y límite de historial. Rechazar roles/instrucciones de sistema enviados por el navegador. Definir manejo de solicitudes duplicadas y simultáneas de una sesión.
- Pruebas: payload inválido, compatibilidad anterior, sesión nueva/expirada y aislamiento. Los otros miembros deben poder trabajar con los fixtures antes de tener un LLM.

### M1.2 — API y adaptadores (4 puntos)

- Implementar `POST /api/chat`, validación de entrada/salida, configuración de origen, errores públicos y límites. Separar handler HTTP del turno del agente y de proveedores.
- Integrar almacenamiento de sesiones según decisión con M2. Inyectar cliente LLM, cliente MCP y almacenamiento para probar sin red. No copiar el diccionario de conversaciones en memoria como solución escalable final.
- Pruebas: un turno completo con dobles, timeout, errores MCP/LLM, entradas grandes, concurrencia y ausencia de secretos en error/log. Publicar un comando de arranque real.

### M1.3 — Agente y comparación final (5 puntos)

- Recomendar según preferencias (género, duración u otras disponibles), desambiguar títulos y consultar las herramientas de M2; no reemplazar consultas por conocimiento supuesto.
- Ofrecer explícitamente comparar películas con sus libros. Usar vínculo/evidencia de M3, elaborar un veredicto subjetivo y explicar límites si solo hay metadatos. Resolver referencias como «esa película» dentro de la sesión.
- Proponer acciones tipadas Google Books/IMDb solo ante intención del usuario; devolver IDs/datos verificables para M4. Una sinopsis maliciosa no puede autorizar navegación.
- Pruebas: recomendación con póster, comparación confirmada, vínculo incierto, sin libro, fuente caída y seguimiento de conversación. Entregar casos funcionales al harness de M3.

### M1.4 — Defensas y arquitectura (4 puntos)

- Aplicar least privilege, allowlist de herramientas/argumentos, presupuesto de tokens/pasos, timeouts, aislamiento de instrucciones/datos y validación de salidas. No confiar en un rechazo textual del LLM como barrera suficiente.
- Cubrir LLM01 directo/indirecto y LLM07 con pruebas de efectos y canarios sintéticos; controles de acceso y secretos siempre fuera del prompt. Aportar al menos 4 casos de ataque al harness y corregir hallazgos.
- Actualizar `ARQUITECTURA.md` con **dos diagramas obligatorios**: alto nivel y bajo nivel del flujo/organización del agente, incluso si es uno solo. Indicar clasificación centralizada o la topología real del MAS, fronteras de confianza, pasos y errores. Incorporar evidencia de escala de M2.

## Criterios de aceptación

- [ ] El SDK envía un mensaje al backend real y obtiene una recomendación con datos rastreables a MCP/TMDB.
- [ ] La comparación usa evidencia de M3, anuncia la capacidad y emite un veredicto razonado o declara insuficiencia de datos.
- [ ] Dos sesiones no comparten historial; solicitudes concurrentes/duplicadas no mezclan resultados ni repiten efectos.
- [ ] Los datos externos no sustituyen instrucciones ni ejecutan herramientas o acciones fuera de política; las evals registran llamadas reales y bloqueadas.
- [ ] Funcionan los fallos controlados de proveedor/cuota/timeout sin filtrar configuración o secretos.
- [ ] Ambos diagramas describen el código final y explican qué escala, qué estado se comparte y qué limita la cuota.
- [ ] Tests del backend y contratos ≥80% en las cuatro métricas, checks de su stack y de integración verdes.

## Verificación y entrega

M2 debe publicar los comandos exactos de lint/tipos, tests/cobertura y arranque del backend para el stack acordado. Ejecutarlos y registrar resultado; no usar `npm run test:coverage` como única prueba si el backend es Python. Con M4 verificar un flujo real desde el widget y con M3 ejecutar evals del agente, con configuración del modelo y sin secretos en reportes.

**Parte completada:** backend real reproducible, contrato consumido por los otros tres, seguridad con evidencia y diagramas finales. Entregar además una explicación de cinco minutos del camino de una solicitud y de un ataque bloqueado. Debes poder explicar los MCP y la navegación aunque no los hayas implementado. La revisión y los commits son humanos.
