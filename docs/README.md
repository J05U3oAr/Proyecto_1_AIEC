# Documentación de AGIChat

Punto de entrada para arquitectura, integración, planificación y evidencias.
Las rutas escritas entre backticks se interpretan desde la raíz del repositorio,
salvo que un comando indique otro directorio de trabajo.

## Guías generales

- [README del proyecto](../README.md): instalación y comandos principales.
- [AGENTS.md](../AGENTS.md): reglas vigentes para personas y agentes.
- [Instrucciones académicas originales](../INSTRUCTIONS.md).
- [Diseño UX/UI](../DESIGN.md).

Los documentos históricos conservan sus resultados y acuerdos de su fecha;
no son nuevas autorizaciones de Git ni acreditan el estado actual. Las reglas
vigentes para agentes están en `AGENTS.md`.

## Arquitectura

- [Arquitectura del sistema](architecture/ARQUITECTURA.md).
- [Explicación de la opción C](architecture/EXPLICACION_OPCION_C.md): contexto de la primera entrega.
- [Contratos y schemas](../shared/contracts/README.md): permanecen junto a los contratos compartidos.

## Integración

- [Estructura y migración de rutas](integration/estructura.md).
- [Conversación, sesiones y metadatos TMDB](integration/conversacion.md).
- [Guía para M3: libros, evidencia y evals](integration/m3-libros-evals.md).
- [Operación de libros y comparación M3.1–M3.3](../mcp/books/README.md).
- [Evaluaciones M3.4: casos, comandos y límites](../evals/README.md).
- [Probar M3 desde el chatbot real](integration/prueba-manual-m3.md).
- [Fixtures de comparación para M4](integration/fixtures/): ejemplos sintéticos validados.

## Segunda entrega

- [Plan y reparto](delivery/plan.md).
- [Seguimiento de hitos](delivery/todo.md).
- [M1 — Diego: backend y agente](delivery/miembro-1-backend-agente.md).
- [M2 — Hugo: películas, infraestructura y CI](delivery/miembro-2-peliculas-infra.md).
- [M3 — Pedro: libros y evals](delivery/miembro-3-libros-evals.md).
- [M4 — Arodi: widget y UX/UI](delivery/miembro-4-widget-ux.md).
- [Contexto del curso y rúbrica](delivery/contexto-curso-rubrica.md).
- [Reutilización de A2A](delivery/reutilizacion-a2a.md).
- [Reutilización de evals](delivery/reutilizacion-evals.md).
- [Decisiones y evidencia de M1](delivery/implementacion-m1.md).
- [Decisiones y evidencia de M2](delivery/implementacion-m2.md).

## Operación por módulo

Los README operativos permanecen junto al módulo que describen:

- [Backend](../server/README.md).
- [MCP películas y utilidades compartidas](../mcp/README.md).
- [Infraestructura y TLS local](../infra/README.md).

## Evidencias

Consultar el [índice de evidencias](evidence/README.md) para conocer el alcance
y las limitaciones de cada reporte. Una prueba con dobles, una consulta real y
una eval adversarial acreditan cosas distintas.

## Organización y mantenimiento

```text
docs/
├── README.md
├── architecture/   # Arquitectura y explicación de diseño técnico
├── integration/    # Guías para conectar módulos y flujos
├── delivery/       # Plan, asignaciones, seguimiento y reportes por miembro
└── evidence/       # Mediciones, consultas y capturas por miembro
```

Al mover un documento, actualizar enlaces relativos y rutas citadas en guías,
README y `AGENTS.md`. Mantener aquí un enlace a las nuevas guías. Los reportes
históricos y las capturas no deben reescribirse para reflejar resultados nuevos:
añadir evidencia fechada con alcance explícito. No guardar secretos.
