# Evidencia M3

## M3.4 — evaluación offline

- [Reporte legible HTML](evals-offline.html).
- [Todas las corridas y comprobaciones JSON](evals-offline.json).
- [Calidad y pendientes](quality-m34-summary.json).
- [Comandos, modos, presupuestos y límites](../../../evals/README.md).

22 casos × 3 repeticiones = 66 resultados aprobados: por repetición,
10 funcionales, 6 LLM01 y 6 LLM07. Se ejecuta `Agent.run` productivo con
completions y catálogo MCP sintéticos, sin red durante la evaluación.
No son resultados del modelo NVIDIA, de los proveedores reales ni del widget.
El hash del dataset del reporte corresponde al archivo `evals/cases.json` actual.

402 pruebas Python aprobadas; Ruff, mypy, contratos y cobertura por archivo
en cuatro métricas aprobados. El resumen registra también los fallos frontend
preexistentes reproducidos; no se declara CI global verde.

El cierre M3.4 conserva pendientes tres corridas del modelo real y los efectos
de navegador con M4. El recorrido completo TMDB/HTTP/widget queda aplazado
hasta contar con el token de M2. La configuración de CI y del provider Promptfoo
no acredita haber ejecutado GitHub Actions o el CLI Promptfoo.

## Registros anteriores

`adaptation-check.json` y `quality-summary.json` corresponden a M3.2.
`comparison-check.json`, `quality-m33-summary.json` y `frontend-m33-check.json`
corresponden a M3.3: incluyen consultas reales a Books con identidad de película
revisada. Sus alcances y fechas son históricos; no sustituyen evals OWASP reales
ni el flujo TMDB/HTTP/widget pendiente.
