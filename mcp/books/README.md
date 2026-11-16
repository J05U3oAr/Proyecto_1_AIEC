# MCP de libros — M3

Carpeta reservada para la implementación de Pedro. **No contiene todavía un
servidor ejecutable ni herramientas implementadas.** El servicio `books` no se
inicia en Compose hasta que M3 lo incorpore con sus pruebas y health checks.

Consultar la [guía de integración](../../docs/integration/m3-libros-evals.md)
y la [asignación de M3](../../docs/delivery/miembro-3-libros-evals.md).
Reutilizar los contratos de `server/sofia/models.py` y las utilidades de
`mcp/catalog_common/`. Configuración de despliegue en `infra/`; documentación
de integración y resultados en `docs/`. No duplicar el agente conversacional.
