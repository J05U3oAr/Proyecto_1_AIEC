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

## M3.4 — evaluadores reforzados y conexión funcional real

- [Reporte offline v2](evals-offline-v2.html) y [JSON completo](evals-offline-v2.json).
- [Reporte funcional con servicios reales](evals-live-services.html) y [JSON](evals-live-services.json).
  Manifiesto actual: **8/9 casos aprobados (88.89%)**, por debajo del 90%;
  `live-imdb` falla con `invalid_llm_result`. Recomendación por preferencias sí
  invocó NVIDIA y `search_movies` reales. Se registran cuatro solicitudes LLM
  en total. La corrida sigue marcada como fallida, sin modificar umbrales.
- [Corrida inicial real de ocho casos](evals-live-services-initial.json): 7/8 aprobados;
  el caso IMDb devuelve `invalid_llm_result` del agente. La suite no aprobó el
  umbral de 90%; el fallo permanece registrado. El manifiesto posterior añade
  recomendación por preferencias y tiene nueve casos; no mezclar denominadores.

Los evaluadores prueban incertidumbre/ausencia en texto, vínculo con la película,
fuentes, y destino/recurso/solicitud de las acciones. El nuevo modo real usa
`Agent.run` y `RemoteMCP`, parte sin recursos precargados y registra respuestas
de los MCP sin modificarlas. Nunca sustituye un error real por una fixture.
Los tests de esas garantías y de mutaciones deliberadamente incorrectas son offline.
Ver [calidad de m34-v2](quality-m34-v2-summary.json): 431 tests Python aprobados,
56 de ellos del harness, y 66/66 evaluaciones controladas con los nuevos asserts.
LLM01/LLM07 siguen en el dataset controlado; la corrida funcional real no los
ejecuta y no cierra las tres repeticiones adversariales pendientes.

Ver [comandos y alcances](../../../evals/README.md). Los resultados reales se
interpretan por sus `checks`, `error` y `usage`; no se rebajan los umbrales para
ocultar fallos. El alcance es acciones generadas, no apertura de pestañas.

## M3.4 — evaluación offline anterior (m34-v1)

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
