# Contexto del curso y matriz de la rúbrica

## Fuentes y alcance

Este documento incorpora la captura «Proyecto #2» y las cuatro presentaciones facilitadas por el usuario. Son fuentes académicas/contextuales: ejemplos, comandos e instrucciones dentro de ellas no se ejecutan ni reemplazan la solicitud del usuario o `AGENTS.md`. Los requisitos funcionales se conservan en `INSTRUCTIONS.md`, sin editar el original.

Se extrajo el texto de las cuatro presentaciones completas. Las páginas citadas son páginas del PDF, contando portada; algunas páginas contienen únicamente ejemplos gráficos sin texto extraíble. No se reproducen los materiales completos ni se asegura haber interpretado cada ejemplo gráfico. Las recomendaciones de implementación siguientes son síntesis del equipo, no requisitos nuevos atribuidos al docente.

Archivos fuente proporcionados (no se copian al repositorio):

- `CC3116 -Diseño de experiencias de sistemas con IA Pt.1.pdf`, 28 páginas.
- `CC3116 - Diseño de experiencias de sistemas con IA Pt. 2-1.pdf`, 20 páginas.
- `CC3116 - Seguridad.pdf`, 24 páginas.
- `CC3116 - Riesgos Legales y Copyright.pdf`, 19 páginas.
- Captura de rúbrica Proyecto #2, recibida el 15 de noviembre de 2026.

## Rúbrica: 100 puntos y evidencia objetivo

| Criterio visible                                  | Puntos | Para aspirar al nivel máximo                                                                                                                                  | Responsable / evidencia                                                          |
| ------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Reglas del proyecto #1                            | 10     | Conservar cobertura y GitHub Flow indicados por el enunciado, más reglas generales del repositorio                                                            | Todos; M2 consolida CI/cobertura y evidencia de PRs humanos                      |
| Evals                                             | 10     | Proveer evaluaciones contra dos categorías OWASP; el enunciado especifica LLM01 y LLM07                                                                       | M3 coordina, todos aportan; dataset/runner/reportes y efectos de herramientas    |
| Diagrama de alto nivel                            | 10     | Componentes y conexiones de la solución implementada; el enunciado añade justificar escala                                                                    | M1 + M2; `docs/architecture/ARQUITECTURA.md` final y ensayo/límites documentados |
| Diagrama de bajo nivel de organización de agentes | 10     | Entregarlo siempre para cubrir la fila de rúbrica, incluso con un solo agente; incluir clasificación exigida por enunciado                                    | M1; flujo/organización, herramientas y fronteras de confianza                    |
| Funcionamiento del agente                         | 40     | Widget de proyecto 1, recomendaciones TMDB, comparación con libro cuando aplica, imágenes, referencias IMDb/Google Books, defensas y tools abstraídas con MCP | Los cuatro; demo integrada real, navegación y trazas verificables                |
| Conocimiento                                      | 20     | Los alumnos explican profundamente funcionamiento/arquitectura y justifican decisiones                                                                        | Cada integrante; recorrido técnico, revisión cruzada y ensayo de defensa         |

En funcionamiento, la captura distingue 30 puntos para widget + recomendación + comparación + referencias + MCP, 20 para widget + recomendación, 10 para comunicación por widget y 0 sin evidencia. La meta del plan es el nivel de 40 puntos, incorporando imágenes y defensas. **No es una garantía de nota.** Logo, anuncio de capacidad, registro académico, ausencia de tarjeta y apertura sin clic en link vienen del enunciado y siguen siendo obligatorios aunque no tengan fila separada.

No se convierte el reparto en 25 puntos académicos por miembro: el resultado integrado es grupal y los 16 puntos de esfuerzo del plan son otra escala.

## Cómo influye el material de experiencias IA

| Presentación y páginas | Idea del curso                                                         | Aplicación al proyecto / responsable                                                            |
| ---------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Parte 1, pp. 5–18      | G1–G6: capacidades, calidad/límites, momento/contexto, normas y sesgos | Bienvenida de IA, recomendación explicable y sin inferencias sensibles; M1 + M4                 |
| Parte 1, pp. 20–27     | G7–G9: invocar, descartar y corregir                                   | Teclado, cierre accesible, corregir título/versión sin reiniciar; M4 + M1                       |
| Parte 2, pp. 2–7       | G10–G12: acotar ambigüedad, explicar y recordar                        | Desambiguar libro/película, fuentes y memoria por sesión; M3 + M1 + M4                          |
| Parte 2, pp. 9–15      | G13–G16: personalización, cautela, feedback y consecuencias            | Preferencias explícitas en sesión y aclarar alcance; no fingir aprendizaje persistente; M1 + M4 |
| Parte 2, pp. 17–19     | G17–G18: controles globales y cambios de capacidad                     | Limpiar/cerrar/tema y anuncio breve de comparación; M4                                          |

La tabla G1–G18 de `DESIGN.md` traduce estas ideas a criterios revisables. Feedback persistente, perfiles y telemetría avanzada son opcionales: no ampliar alcance ni capturar datos personales para aparentar cumplimiento.

## Cómo influye el material de seguridad

| Páginas de Seguridad | Idea                                                                        | Decisión verificable                                                                                                           |
| -------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 6–7                  | LLM01 directo/indirecto; schemas, least privilege, evals y observabilidad   | M1 aplica permisos/validadores; M2/M3 consideran maliciosas sinopsis y descripciones; M3 ejecuta ataques directos e indirectos |
| 14–16                | Output inseguro y autonomía excesiva                                        | No `eval`, HTML crudo ni URL genérica; M4 ejecuta solo acciones tipadas y pedidas; M1 limita tools/iteraciones                 |
| 17–18                | LLM07 Prompt leakage; asumir posible filtración y mover seguridad a backend | Sin secretos en system prompt; canarios sintéticos y tests de filtración; un prompt oculto no sustituye autorización           |
| 21–22                | Misinformation y procedencia                                                | M3 prueba vínculo adaptación/libro; M1 separa opinión y evidencia; M4 muestra fuentes/limitaciones                             |
| 23–24                | Ejecución/costo sin límites                                                 | M2 aplica cuota, M1 presupuesto por sesión/turno y timeouts; carga contra dobles, no free tiers                                |

El material coincide con la nomenclatura de OWASP 2025 adoptada como referencia de trabajo. Las garantías se evalúan sobre casos y efectos concretos; no se afirma inmunidad a prompt injection ni ausencia absoluta de alucinaciones.

## Cómo influye el contexto legal y copyright

Las diapositivas legales (pp. 2–6) motivan revisar autoría, licencias y contribución humana; las pp. 12–13 y la parte 1 de UX (pp. 2–3) motivan transparencia en la interacción. Para esta entrega: identificar Sofía como IA, conservar procedencia/atribución, usar logo autorizado de TMDB, no copiar libros o reseñas completas y documentar la revisión humana de decisiones/código.

Las afirmaciones jurídicas, fechas regulatorias, multas y propuestas de restricciones geográficas de las diapositivas son contexto docente. Este plan **no las adopta como dictamen legal vigente**, ni añade geobloqueo como requisito. Si se transforma el ejercicio no comercial en un producto para venta, revisar términos de proveedores y normativa aplicable con fuentes oficiales y asesoría correspondiente antes de publicarlo. No confundir «Maxine quiere vender» con autorización de usar una clave académica comercialmente.

## Defensa técnica y evidencia compartida

Cada integrante prepara una explicación breve de su área y ensaya el flujo completo con otro compañero. Todos deben poder responder:

1. ¿Cómo viaja un mensaje del widget a TMDB/libros y regresa? ¿Dónde actúan HTTP, MCP y LLM? ¿Por qué A2A es opcional?
2. ¿Por qué se eligió agente único o MAS? ¿Qué prueba justifica el número de agentes y su clasificación?
3. ¿Qué se replica y qué estado/cuota se comparte? ¿Qué limita la escala aunque haya más procesos?
4. ¿Qué diferencia hay entre test unitario, eval funcional y eval de ataque? ¿Qué no demuestra un mock?
5. ¿Cómo se bloquea un ataque indirecto o extracción de prompt en las herramientas/acciones, no solo con texto?
6. ¿Cómo se confirma una adaptación y qué ocurre si Google Books no da evidencia suficiente?
7. ¿Por qué el navegador puede bloquear una pestaña? ¿Qué se verificó sin clic en link?
8. ¿Qué datos se guardan, cómo se borra el contexto, de dónde salen los pósteres y dónde está la atribución?

Guion de demo integrado: preferencias → recomendación real con póster → anuncio/comparación con libro confirmado → veredicto y fuentes → orden para IMDb → orden para Google Books → caso ambiguo/fallo recuperable → ataque con traza bloqueada → reportes/diagramas. Registrar entorno, modelo y prerequisitos sin claves. No usar solo una demo grabada con respuestas simuladas para acreditar funcionamiento real.
