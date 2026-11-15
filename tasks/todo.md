# Seguimiento — segunda entrega

Estado inicial: planificación lista para revisión; implementación y evidencia pendientes. No marcar checks por haber escrito documentación. Criterios detallados y verificación están en cada archivo individual. Dependencias: hito 0 primero, luego porciones integradas; ver `plan.md`.

## Hito 0 — contratos y riesgos

- [ ] M1.1: schemas y fixtures HTTP/MCP + sesión aprobados por consumidores. [Detalle M1](miembro-1-backend-agente.md).
- [ ] M2: prueba mínima TMDB/MCP, proveedor sin tarjeta y decisión de stack con M1. [Detalle M2](miembro-2-peliculas-infra.md).
- [ ] M3: consulta Google Books y evidencia de una adaptación confirmada. [Detalle M3](miembro-3-libros-evals.md).
- [ ] M4: prueba real de apertura sin clic en link y estrategia/permisos documentados. [Detalle M4](miembro-4-widget-ux.md).
- [ ] Revisión humana del reparto, contratos y decisión Python/TypeScript; resolver riesgos antes de ampliar implementación.

## Hito 1 — recomendación de extremo a extremo

- [ ] M1.2: backend validado y sesión aislada, con tests; depende de M1.1.
- [ ] M2.1: tools de películas invocables por cliente MCP independiente; depende del contrato.
- [ ] M2.2: póster, detalles y referencia IMDb válidos, con tests; depende de M2.1.
- [ ] M4.1: cliente/store/SDK con modo real y compatibilidad antigua; depende de fixtures de M1.1.
- [ ] M4.2 (recomendación): ficha accesible y estados, con tests; depende del contrato TMDB.
- [ ] Checkpoint: widget → backend → agente → MCP → TMDB con póster real; tests/checks de módulos incorporados y revisión cruzada.

## Hito 2 — comparación y referencias

- [ ] M3.1: tools de libros invocables por MCP independiente; depende del contrato y utilidades de cuota de M2.
- [ ] M3.2: vínculo confirmado/ambiguo/no encontrado distinguible, con evidencia y tests; depende de M3.1.
- [ ] M3.3: evidencia comparativa y límites documentados; depende de M3.2.
- [ ] M1.3: razonamiento integrado, anuncio de capacidad y acciones tipadas; depende de herramientas M2/M3.
- [ ] M4.2 (comparación): vista accesible y recuperaciones; puede avanzar con fixtures de M3.
- [ ] M4.3: navegación segura a ambos destinos, deduplicación, bloqueo e historial probados; depende de M1.3 y prueba temprana.
- [ ] Checkpoint: comparación real sustentada y dos aperturas sin clic en enlace; comprobar errores parciales y revisar con personas.

## Hito 3 — robustez y entrega

- [ ] M2.3: caché/cuota compartidas y concurrencia verificadas; iniciar utilidades antes de cerrar MCP libros.
- [ ] M1.4: defensas y diagramas alto/bajo nivel coherentes; depende de flujo implementado y evidencia de M2/M3/M4.
- [ ] M3.4: harness y dataset funcional/LLM01/LLM07, con aportes de todos; runner puede iniciarse con fixtures desde hito 0 y adaptar [HDT6 según el análisis](reutilizacion-evals.md), sin duplicar el harness de HDT7.
- [ ] M2.4: CI de todos los módulos, comandos y operación desde clon limpio; incorporar módulos progresivamente.
- [ ] M4.4: créditos oficiales, demo y evidencia de navegador/E2E; depende de funcionalidades integradas.
- [ ] Suite real repetida y reportada, invariantes de seguridad correctas y fallos funcionales resueltos según umbrales del equipo.
- [ ] Cobertura ≥80% en cuatro métricas por módulo productivo, lint/formato/tipos/build app y SDK verdes.
- [ ] Escalabilidad documentada con ensayo reproducible y limitaciones de free tiers, sin pruebas de carga a APIs reales.
- [ ] Protección de main y PRs con revisión por compañero comprobados por mantenedor; commits/merge solo humanos.
- [ ] Matriz de 100 puntos revisada, guion de demo y ensayo de defensa de todos. [Rúbrica y contexto](contexto-curso-rubrica.md).
- [ ] Revisión humana final: repo ejecutable, documentación final, evidencias sin secretos y requisitos de `INSTRUCTIONS.md` completos.
