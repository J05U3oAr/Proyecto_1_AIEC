# Evidencias

Los archivos de `m2/` se trasladaron desde `mcp/evidence/` sin modificar su
contenido. Son resultados de ejecuciones anteriores; no certifican CI remoto,
aprobación humana, MCP libros ni la entrega completa.

| Evidencia M2                                         | Alcance                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| [Resumen de calidad](m2/quality-summary.json)        | Checks locales de la implementación inicial M2; conteos históricos |
| [Carga offline](m2/benchmark.json)                   | Concurrencia con proveedor simulado, sin carga a APIs reales       |
| [Integración inicial](m2/live-check.json)            | Consultas reales iniciales, incluidos fallos observados            |
| [Conversación HTTP](m2/dialogue-check.json)          | Diez casos reales de conversación y selección                      |
| [Metadatos HTTP](m2/metadata-check.json)             | Siete casos reales de puntuación TMDB, géneros y duración          |
| [Widget mock](m2/mock-browser.jpg)                   | Captura de demostración MSW                                        |
| [Widget real inicial](m2/real-browser.jpg)           | Captura del estado inicial de integración                          |
| [Conversación en navegador](m2/dialogue-browser.jpg) | Captura posterior a la corrección conversacional                   |
| [Metadatos en navegador](m2/metadata-browser.jpg)    | Ficha con géneros, duración y puntuación TMDB                      |

Interpretación y comandos en [implementación M2](../delivery/implementacion-m2.md),
[flujo conversacional](../integration/conversacion.md) y
[operación MCP](../../mcp/README.md). Votos y puntuaciones pueden variar con el tiempo.
M3 debe añadir sus propios reportes con dataset, configuración, repeticiones,
consumo y fallos; estos archivos no reemplazan las evals de seguridad.

## Reorganización de estructura

[Comparación antes/después](estructura/README.md): checks, servicios, sesión y
pruebas en navegador tras centralizar la infraestructura en `infra/`.
