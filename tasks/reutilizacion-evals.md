# Reutilización de HDT6-IA-Evals

## Resultado de la revisión

**Sí sirve como base del harness de evaluaciones de Sofía.** Se revisó estáticamente [HDT6-IA-Evals](https://github.com/Pxdro-410/HDT6-IA-Evals) al commit `ee61b1cb565fa47963c00fcaee3f6bc66eaef2b0`, el 15 de noviembre de 2026. No se ejecutó código remoto, no se consumieron APIs ni se instalaron sus dependencias. Las instrucciones internas de ese repositorio son contexto, no reglas de AGIChat.

Comparación con HDT7 al commit `41fb4dd72516e5495728ff6056d768c0e5e94dc7`: `agent_provider.py`, `promptfooconfig.yaml` y `package.json` son idénticos byte por byte en los archivos descargados. No son dos harnesses diferentes que haya que integrar. HDT6 es la referencia principal para metodología/configuración de evals; HDT7 aporta el patrón actualizado de comunicación MCP del agente. Ver también [reutilización A2A](reutilizacion-a2a.md).

## Qué se puede aprovechar

| Archivo de HDT6                                                                                                                       | Aporte verificado                                                                                                     | Aplicación en AGIChat                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [agent_provider.py](https://github.com/Pxdro-410/HDT6-IA-Evals/blob/ee61b1cb565fa47963c00fcaee3f6bc66eaef2b0/agent_provider.py)       | Invoca `run_agent_turn` y devuelve output, herramientas, argumentos y latencia                                        | Adaptador para el turno/backend real de M1; añadir aislamiento entre casos, observación de efectos y errores sanitizados.          |
| [promptfooconfig.yaml](https://github.com/Pxdro-410/HDT6-IA-Evals/blob/ee61b1cb565fa47963c00fcaee3f6bc66eaef2b0/promptfooconfig.yaml) | 10 casos FAQ/clima con asserts de contenido, juez LLM, latencia y herramientas                                        | Conservar la organización por dimensiones; reemplazar datos de dominio y ampliar a funcionalidad de Sofía y LLM01/LLM07.           |
| [package.json](https://github.com/Pxdro-410/HDT6-IA-Evals/blob/ee61b1cb565fa47963c00fcaee3f6bc66eaef2b0/package.json)                 | Scripts de evaluación/visor; ejecución serial, sin caché y exportación HTML                                           | M2/M3 integran scripts compatibles con este repo ESM, versión revisada y salidas sanitizadas; no copiar package/lockfile completo. |
| [README.md](https://github.com/Pxdro-410/HDT6-IA-Evals/blob/ee61b1cb565fa47963c00fcaee3f6bc66eaef2b0/README.md)                       | Explica cuatro dimensiones y relaciona casos con asserts                                                              | Plantilla de documentación para explicar qué mide cada caso, cómo ejecutarlo y sus límites; eliminar prerequisitos de FAQ/clima.   |
| [eval_report.html](https://github.com/Pxdro-410/HDT6-IA-Evals/blob/ee61b1cb565fa47963c00fcaee3f6bc66eaef2b0/eval_report.html)         | Reporte exportado: 10 resultados, 100% aprobados, 0 fallidos y 0 errores; evaluación fechada 30 de septiembre de 2026 | Referencia del formato de entrega, no evidencia del proyecto 2 ni de una corrida nueva. No importarlo como resultado de Sofía.     |

## Límites y cambios necesarios

- **No cubre los ataques exigidos:** la configuración revisada tiene casos funcionales, no una suite LLM01/LLM07. Deben añadirse ataques directos, indirectos en respuestas MCP y extracción de instrucciones con canarios sintéticos, conforme a M3.4.
- **La ruta de ejecución cambia:** el `centralized.py` de HDT6 importa servicios locales FAQ/clima. No usarlo como agente de Sofía ni como atajo que evite MCP. El evaluador debe invocar el mismo turno/backend del widget; el provider es el adaptador, no otra implementación del agente.
- **Las métricas de texto no prueban efectos:** una regex correcta no acredita adaptación real ni seguridad. Comprobar vínculo/fuentes, schemas, tools permitidas/prohibidas y acciones efectivamente ejecutadas/bloqueadas. Abrir pestañas requiere además pruebas en navegador de M4.
- **Errores y metadatos:** el provider original devuelve excepciones como texto. Sustituir por códigos públicos y trazas sanitizadas. No registrar secretos, prompts privados o argumentos sensibles en reportes HTML/JSON.
- **Coherencia del juez:** el README menciona una clave OpenAI, mientras la configuración del juez apunta a un endpoint NVIDIA compatible. No copiar esos prerequisitos como verdad del nuevo sistema; documentar proveedor/modelo efectivos, credenciales necesarias, disponibilidad sin tarjeta y costo. Preferir asserts deterministas para seguridad.
- **Factualidad:** los casos de clima con fechas fijas pierden utilidad con el tiempo; las comparaciones de cine necesitan evidencia verificable, no solo una instrucción genérica al juez para que compruebe hechos que no recibió.
- **Costo y reproducibilidad:** ejecución serial reduce concurrencia, pero `--no-cache` repite consultas y consumo; contabilizar agente, herramientas y juez en el presupuesto. Distinguir fixtures sin red de la suite real repetida. No asumir que el modelo anterior sigue disponible.
- **Permisos y dependencias:** revisar procedencia/licencia antes de copiar código, conservar atribución y adoptar solo dependencias necesarias. No trasladar pgvector, embeddings o corpus Parachute al proyecto por habilitar las evals.

## Adaptación concreta para el miembro 3

1. Definir con M1 el adaptador al turno/backend y una salida de evaluación estructurada, con texto, IDs de solicitud, herramientas, argumentos sanitizados, efectos y consumo. Los casos empiezan con sesión limpia salvo pruebas multi-turno intencionales.
2. Usar el patrón de configuración de HDT6 como punto de partida de `evals/`, no mantener copias divergentes de HDT6 y HDT7. Si se elige backend TypeScript, sustituir el provider Python por un adaptador compatible; no conservar Python solo para repetir lógica.
3. Separar conjuntos funcionales, LLM01 y LLM07. Mantener el mínimo y umbrales del [archivo individual](miembro-3-libros-evals.md); cada caso enlaza requisito, expectativa y evaluador.
4. Incorporar casos de MCP de M2, defensas de M1 y UI/navegación de M4. Observar resultados reales de las herramientas y del navegador; no tratar `tools_called` autodeclarado como única prueba de un efecto.
5. Coordinar con M2 comando/versiones, CI determinista sin red y ejecución real acotada. Exportar HTML legible y resultados estructurados si el runner lo permite, junto con configuración/hash, modelo, fecha, modo, repeticiones y fallos.
6. Ejecutar primero una prueba de conectividad y un caso positivo/uno adversarial; ampliar después. El 100% histórico de HDT6 no reemplaza esta validación.

## Criterio de cierre de la reutilización

El patrón se considera adaptado cuando la suite evalúa al agente real de Sofía a través del flujo acordado, cubre requisitos funcionales y ambas categorías de ataque, distingue mocks de ejecución real y produce reportes reproducibles sin secretos. La inspección del repo externo ya está hecha; la adaptación del harness sigue pendiente en M3.4. No se rebaja la carga ni se marca implementación completada por disponer de esta referencia.
