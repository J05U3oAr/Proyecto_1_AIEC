# Evidencia M3

## Recorrido funcional real desde el widget

- [Captura de comparación en Edge](widget-live-comparison.png).
- [Tres turnos del widget, sin mocks ni respuestas interceptadas](widget-live-check.json).
- [HTTP real: Blade Runner, Dune 2021 y Dune 1984](http-live-check.json).
- [Cómo repetir la prueba desde PowerShell y la interfaz](../../integration/prueba-manual-m3.md).

Se verificó selección TMDB → sesión HTTP → MCP Books → comparación visible.
Blade Runner y Dune 2021 confirman el vínculo; Dune 1984 está fuera de la colección
revisada. Las sesiones de prueba se borraron al terminar. El backend devuelve
póster y fuentes, pero el widget actual solo presenta texto. Tarjetas, fuentes
visibles y apertura real de pestañas siguen pendientes de M4. Este recorrido
no prueba inferencia NVIDIA ni reemplaza las corridas OWASP del modelo real.

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
de navegación con M4. El recorrido textual TMDB/HTTP/widget ya se verificó
con el token de M2 en la evidencia anterior. La configuración CI/Promptfoo
no acredita haber ejecutado GitHub Actions o el CLI Promptfoo.

## Registros anteriores

`adaptation-check.json` y `quality-summary.json` corresponden a M3.2.
`comparison-check.json`, `quality-m33-summary.json` y `frontend-m33-check.json`
corresponden a M3.3: incluyen consultas reales a Books con identidad de película
revisada. Sus alcances y fechas son históricos; no sustituyen evals OWASP reales
ni el nuevo recorrido TMDB/HTTP/widget registrado por separado.
