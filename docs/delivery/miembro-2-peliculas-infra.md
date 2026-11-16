# Miembro 2 — Hugo Méndez: películas MCP, infraestructura y CI

## Contexto y meta

Leer las reglas, el plan común y `docs/delivery/reutilizacion-a2a.md`. M2 incorpora ahora TMDB y MCP; ver `docs/delivery/implementacion-m2.md` para evidencia y límites. Tu meta es entregar herramientas de películas utilizables por Sofía y por otro cliente MCP, junto con un arranque y controles de calidad que incluyan todos los módulos nuevos.

Carga: 16 puntos. Propiedad: `mcp/movies/`, pruebas, `infra/`, `.github/`, configuraciones raíz, scripts, lockfiles, `.env.example` y sección operativa de `README.md`. La atribución visual es de M4; tú verificas la procedencia de recursos. No asumir que FastMCP y A2A son equivalentes.

## Objetivos y tareas ordenadas

### M2.1 — Servidor MCP de películas (5 puntos)

- Tras acordar schema con M1, exponer búsqueda/descubrimiento y detalles con entradas acotadas, resultados estructurados y errores distinguibles. Separar adaptador TMDB y transporte MCP.
- Basarse en el patrón de `mcp_server.py` del repo A2A si se elige Python; cambiar dominio, validación, logging y errores. Probar listado e invocación con un cliente MCP independiente, no solo importando funciones.
- Tests: schemas/argumentos inválidos, resultados vacíos, desambiguación, proveedor malformado y manejo de errores MCP.

### M2.2 — Catálogo, póster y referencia IMDb (3 puntos)

- Entregar título, año, sinopsis, identificador y póster nullable; obtener configuración/rutas de imagen de forma verificada. No crear pósteres ni IDs ficticios.
- Resolver referencia IMDb a partir del identificador externo de una película. Permitir únicamente destino HTTPS y hostname/ruta válidos; no construir destinos desde texto libre del modelo. «IMBD» en el enunciado se interpreta como IMDb.
- Documentar registro humano académico CC3116/UVG, uso no comercial y sin tarjeta. Proporcionar a M4 enlaces de logos oficiales y aviso vigente. Mantener claves solo en servidor.
- Tests: póster ausente, ID IMDb ausente, títulos repetidos y URLs maliciosas.

### M2.3 — Caché, cuota y fallos (4 puntos)

- Implementar utilidades de caché/cuota reutilizables por M3, con configuración por proveedor, expiración y presupuesto diario del curso. Definir reinicio del día y contabilizar reintentos/caché misses de forma consistente.
- Evitar que dos réplicas gasten dos presupuestos independientes. Elegir con M1 un mecanismo compartido y probar carreras/contadores atómicos con dobles o entorno local.
- Acotar requests, latencia y reintentos; respetar `429`, backoff y errores de autenticación. Publicar estado de cuota agotada sin inducir al agente a insistir.
- Tests: cache hit/miss/expiración, límite diario, dos réplicas/concurrencia y proveedor caído. No probar carga contra el free tier real.

### M2.4 — Operación y calidad global (4 puntos)

- Proveer arranque reproducible frontend/backend/MCP, variables de ejemplo sin secretos, health checks y apagado. Mantener modo mock explícito para demo/tests; no permitir que MSW capture el modo real.
- Ampliar CI para frontend, SDK, backend, shared y ambos MCP, con las cuatro métricas de cobertura ≥80% por módulo productivo. Si se adopta Python, añadir runner/cobertura y dependencias reproducibles de Python; no dejarlos fuera de Vitest sin sustituto.
- Coordinar script de evals de M3: casos deterministas sin credenciales en PR y ejecución real acotada con resultados adjuntos antes de entrega. El script actual de formato solo revisa `src`; extender alcance a nuevos módulos según su lenguaje.
- Documentar ejecución desde clon limpio, contenedores opcionales, límites y ensayo reproducible de concurrencia con proveedores simulados. Registrar entorno, carga, p50/p95, errores y cuotas compartidas; M1 integra esto en arquitectura.

## Criterios de aceptación

- [x] Otro cliente MCP puede listar/invocar las tools sin depender del frontend ni del orquestador.
- [ ] Una recomendación real devuelve datos TMDB, póster si existe y referencia IMDb válida si existe.
- [x] Créditos y registro académico están documentados; ninguna credencial llega al bundle o reporte.
- [x] El presupuesto diario y caché son coherentes entre dos instancias y ante fallos/reintentos.
- [ ] Un clon limpio arranca el sistema con pasos verificables; no se exige tarjeta para la demo.
- [ ] CI cubre todos los módulos productivos, conserva ≥80% en líneas/funciones/ramas/sentencias y compila SDK.
- [ ] Un mantenedor verificó protección de `main`, checks requeridos y revisión por un compañero; registrar evidencia sin que el agente cambie reglas remotas.

## Auditoría de los criterios de aceptación (15/11/2026)

Los checks se refieren a evidencia de cumplimiento, no solo a que exista código.
El cierre de M2 **todavía no está completo**: M2.1–M2.3 están implementados y
verificados; M2.4 y sus criterios de integración tienen pendientes.

| Criterio                                             | Estado                    | Evidencia o pendiente concreto                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cliente MCP independiente                            | Cumplido                  | Cliente HTTP lista/invoca las tools; consumidor M1 compatible. Tests en `mcp/tests/test_mcp_movies.py`.                                                                                                                                                                                                                                    |
| Recomendación real con datos, póster e IMDb          | Parcial                   | TMDB/MCP devuelve póster e IMDb y un `Agent.run` real completó recomendación. Los intentos por HTTP/widget no acreditaron un recorrido estable: hubo rechazos/errores y una respuesta sin recurso verificado. Conservar abierto hasta probar la integración completa; presentación enriquecida depende de M4 y estabilidad/evals de M1/M3. |
| Créditos/registro documentados y secretos protegidos | Cumplido                  | Instrucciones académicas, aviso y recursos oficiales en `mcp/README.md`; verificación de que los secretos locales no aparecen en fuentes/reportes/bundles. Este criterio documenta el registro; no certifica datos privados de la cuenta ni acredita los Créditos visibles de M4. Antes estaba cumplido pero sin marcar.                   |
| Cuota y caché compartidas                            | Cumplido                  | Pruebas Redis entre instancias y dos procesos, concurrencia, fallos, reintentos y límite más estricto.                                                                                                                                                                                                                                     |
| Arranque desde clon limpio sin tarjeta               | Pendiente de acreditación | Imágenes y arranque local comprobados con lockfiles, pero no se hizo una instalación completa desde un clon/exportación limpio. Tener pasos documentados no equivale a haber ejecutado esa comprobación.                                                                                                                                   |
| CI de todos los módulos y cobertura/build            | Parcial                   | Workflow preparado y checks locales aprobados (184 Python, 60 frontend, SDK y cobertura por archivo). No hay run remoto de estos cambios; MCP libros y harness de evals de M3 aún deben incorporarse a los controles cuando existan.                                                                                                       |
| Protección de main y revisión de compañero           | Pendiente humano          | No se verificaron reglas remotas ni aprobación de PR por un compañero. La revisión de otro agente no sustituye ese requisito.                                                                                                                                                                                                              |

Detalle reproducible y resultados, incluidos fallos:
[evidencia de M2](implementacion-m2.md). Los pendientes no se eliminan ni se
rebajan por pertenecer a una integración compartida: se mantienen hasta obtener
la evidencia correspondiente.

## Verificación y entrega

Ejecutar los comandos frontend de `AGENTS.md`, los nuevos de backend/MCP y el ensayo con upstream simulado. Ejecutar una consulta TMDB real acotada y rastrearla hasta una tarjeta visible con M4. Entregar configuración de arranque, tabla de variables sin valores secretos, resultados de CI/cobertura y explicación de límites de escala.

**Parte completada:** herramientas TMDB reales e independientes, cuota compartida verificada y operación reproducible de todo el sistema. Preparar defensa del recorrido hasta TMDB, caché, cuotas y por qué agregar réplicas no aumenta el free tier. También debes poder explicar comparación y defensas generales. No hacer commits, push ni despliegues externos con IA.

## Avance implementado en `feat/mcp`

M2.1–M2.3 están implementados con pruebas de regresión y consulta TMDB real.
M2.4 tiene CI/operación local y TLS opcional verificados; la corrida remota,
protección de main y la demo enriquecida con M3/M4 siguen pendientes.
Consultar [evidencia](implementacion-m2.md), [uso MCP](../../mcp/README.md)
y [operación](../../infra/README.md). La tabla de auditoría anterior distingue
cumplimiento, implementación parcial y evidencia pendiente por criterio.
