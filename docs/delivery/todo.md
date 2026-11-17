# Seguimiento — segunda entrega

Actualización M3.1–M3.3 (17/11/2026): búsqueda/detalles, relación y comparación de
premisas implementadas. Colección finita: cinco películas/cuatro novelas, incluida
Blade Runner. Selección TMDB → sesión HTTP → MCP Books → comparación textual
verificadas desde el widget real, sin mocks. Ver la
[prueba manual](../integration/prueba-manual-m3.md) y el
[MCP libros](../../mcp/books/README.md). M3.4 dispone de runner y 22 casos con
catálogo/modelo sintéticos, reportes JSON/HTML y configuración CI offline;
quedan pendientes tres corridas del modelo real y las tarjetas/acciones de M4.
Ver [operación de evals](../../evals/README.md).

Estado inicial: planificación lista para revisión; implementación y evidencia pendientes. No marcar checks por haber escrito documentación. Criterios detallados y verificación están en cada archivo individual. Dependencias: hito 0 primero, luego porciones integradas; ver `plan.md`.

Actualización M1 (15/11/2026): backend, contratos, sesiones Redis y cliente MCP
implementados con pruebas locales; probe NVIDIA real con catálogo sintético.
Ver [evidencia y pendientes](implementacion-m1.md). La aprobación del
contrato por consumidores y la integración widget/proveedores/evals siguen
pendientes; estos checks globales no se cierran con dobles.

## Hito 0 — contratos y riesgos

- [ ] M1.1: schemas y fixtures HTTP/MCP + sesión aprobados por consumidores. [Detalle M1](miembro-1-backend-agente.md).
- [ ] M2: prueba mínima TMDB/MCP, proveedor sin tarjeta y decisión de stack con M1. [Detalle M2](miembro-2-peliculas-infra.md).
- [x] M3: consulta Google Books y evidencia de una adaptación confirmada. [Detalle M3](miembro-3-libros-evals.md).
- [ ] M4: prueba real de apertura sin clic en link y estrategia/permisos documentados. [Detalle M4](miembro-4-widget-ux.md).
- [ ] Revisión humana del reparto, contratos y decisión Python/TypeScript; resolver riesgos antes de ampliar implementación.

## Hito 1 — recomendación de extremo a extremo

- [ ] M1.2: backend validado y sesión aislada, con tests; depende de M1.1.
- [x] M2.1: tools de películas invocables por cliente MCP independiente; depende del contrato.
- [x] M2.2: póster, detalles y referencia IMDb válidos, con tests; depende de M2.1.
- [ ] M4.1: cliente/store/SDK con modo real y compatibilidad antigua; depende de fixtures de M1.1.
- [ ] M4.2 (recomendación): ficha accesible y estados, con tests; depende del contrato TMDB.
- [ ] Checkpoint: widget → backend → agente → MCP → TMDB con póster real; tests/checks de módulos incorporados y revisión cruzada.

## Hito 2 — comparación y referencias

- [x] M3.1: tools de libros invocables por MCP independiente; contratos y utilidades de cuota de M2 reutilizados.
- [x] M3.2: vínculo confirmado/ambiguo/no encontrado distinguible, con evidencia y tests; colección limitada y fallos de proveedor diferenciados.
- [x] M3.3: premisas con fuentes, veredicto condicional acotado, límites y fixtures documentados; integrado al turno M1 existente. Selección TMDB y comparación textual del widget verificadas con servicios reales; tarjetas y navegación de M4 pendientes.
- [ ] M1.3: razonamiento integrado, anuncio de capacidad y acciones tipadas; depende de herramientas M2/M3.
- [ ] M4.2 (comparación): vista accesible y recuperaciones; puede avanzar con fixtures de M3.
- [ ] M4.3: navegación segura a ambos destinos, deduplicación, bloqueo e historial probados; depende de M1.3 y prueba temprana.
- [ ] Checkpoint: comparación real sustentada y dos aperturas sin clic en enlace; comprobar errores parciales y revisar con personas.

## Hito 3 — robustez y entrega

- [x] M2.3: caché/cuota compartidas y concurrencia verificadas; iniciar utilidades antes de cerrar MCP libros.
- [ ] M1.4: defensas y diagramas alto/bajo nivel coherentes; depende de flujo implementado y evidencia de M2/M3/M4.
- [ ] M3.4: runner y dataset de 22 casos funcional/LLM01/LLM07 implementados sobre Agent.run, con adaptador Promptfoo y CI offline. Cierre pendiente de corridas reales repetidas y efectos de navegador con M4; [comandos y límites](../../evals/README.md).
- [ ] M2.4: CI de todos los módulos, comandos y operación desde clon limpio; incorporar módulos progresivamente.
- [ ] M4.4: créditos oficiales, demo y evidencia de navegador/E2E; depende de funcionalidades integradas.
- [ ] Suite real repetida y reportada, invariantes de seguridad correctas y fallos funcionales resueltos según umbrales del equipo.
- [ ] Cobertura ≥80% en cuatro métricas por módulo productivo, lint/formato/tipos/build app y SDK verdes.
- [ ] Escalabilidad documentada con ensayo reproducible y limitaciones de free tiers, sin pruebas de carga a APIs reales.
- [ ] Protección de main y PRs con revisión por compañero comprobados por mantenedor; commits/merge solo humanos.
- [ ] Matriz de 100 puntos revisada, guion de demo y ensayo de defensa de todos. [Rúbrica y contexto](contexto-curso-rubrica.md).
- [ ] Revisión humana final: repo ejecutable, documentación final, evidencias sin secretos y requisitos de `INSTRUCTIONS.md` completos.

Actualización M2: herramientas TMDB reales, transporte MCP con token, caché/cuotas
Redis y prueba entre procesos implementados; 184 tests Python y 60 frontend
aprobados. Operación local/CI preparada; no se ejecutó CI remoto ni se completó
la parte de libros/UI enriquecida. Ver [evidencia M2](implementacion-m2.md).

Actualización de traspaso a M3 (15/11/2026): M2 amplió metadatos TMDB y corrigió
continuidad conversacional; última verificación 248 tests Python y 70 frontend.
Cambios subidos por Hugo; tracking local sincronizado al revisar. No se verificó
el resultado remoto de CI ni revisión/protección de main. M3 recibe la
[guía de integración](../integration/m3-libros-evals.md); sus herramientas, evals y checks de
cierre siguen pendientes hasta demostrar su funcionamiento.
