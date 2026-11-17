# Evaluaciones de Sofía — M3.4

El runner llama a `sofia.agent.Agent.run`, el mismo turno del backend del widget.
No mantiene otro agente. Hay 22 casos versionados: 10 funcionales, 6 LLM01
(3 directos y 3 indirectos en sinopsis, descripción y evidencia MCP), y 6 LLM07
(extracción, traducción, codificación y conversaciones de dos turnos).
La edición OWASP acordada es 2025. Los casos iniciales de M1 permanecen en
`server/evaluation_cases.json`; sus objetivos se amplían en `cases.json`.

Actualización del ejecutor `m34-v2`: evaluadores reforzados y modo `live-services`
con el adaptador productivo `RemoteMCP`. Los reportes `m34-v1` son históricos;
no prueban los nuevos asserts aunque compartan el mismo dataset controlado.

## Ejecutar sin claves y sin consumo

Desde la raíz del repositorio, con Docker Desktop iniciado:

```powershell
docker build -f infra/docker/evals.Dockerfile -t sofia-evals .
New-Item -ItemType Directory -Force docs/evidence/m3 | Out-Null
docker run --rm --network none --user 0:0 --mount "type=bind,source=$($PWD.Path)\docs\evidence\m3,target=/reports" sofia-evals --mode offline --repetitions 3 --output /reports/evals-offline.json
```

El primer comando construye el entorno Python con el lock existente. Descarga
imágenes/dependencias si faltan; no consulta modelos ni catálogos. El segundo
crea la carpeta de reportes. El tercero ejecuta 66 casos (22 × 3) con la red
deshabilitada y escribe JSON y HTML. Abrir `docs/evidence/m3/evals-offline.html`
en el navegador para revisar todos los casos y sus fallos. Código de salida 1
significa que alguna repetición no alcanzó los umbrales; 0 indica que los alcanzó.
No se usa `.env` ni se necesita el token M2 para esta ejecución.
`--user 0:0` permite escribir el reporte en la carpeta compartida de Docker Desktop
en Windows; la ejecución sigue sin red ni credenciales. La imagen, por defecto,
usa el usuario 10001 cuando no se necesita escribir en una carpeta del host.

Alternativa con Python 3.12 y uv instalados:

```powershell
cd server
uv sync --frozen
uv run --frozen python ../evals/run_evals.py --mode offline --repetitions 3 --output ../docs/evidence/m3/evals-offline.json
```

El modo `offline` utiliza el agente productivo con catálogo y completions
sintéticos. Comprueba contratos y barreras deterministas. **No mide la resistencia
del modelo NVIDIA ni acredita consultas reales TMDB/Google o el widget.** Algunas
respuestas simuladas proponen deliberadamente `shell` o filtran un canario para
comprobar el bloqueo; otras simulan una respuesta segura. Esto último no prueba
que un modelo real rechace traducciones o codificaciones.

## Evaluación del modelo real, con catálogo controlado

`--mode real-model` conecta el adaptador productivo `NvidiaLLM`, pero mantiene el
MCP sintético para poder inyectar ataques reproducibles sin alterar los servicios
reales. No necesita TMDB. Exige `NVIDIA_API_KEY`, Redis disponible en `REDIS_URL`
y `--confirm-no-billing`: la persona debe haber verificado previamente que su
endpoint/cuenta no genera cargos. El flag es una declaración del operador,
no una verificación automática de facturación. Nunca añadir tarjetas.

Con las variables ya disponibles en el entorno del proceso:

```powershell
cd server
uv run --frozen python ../evals/run_evals.py --mode real-model --repetitions 3 --confirm-no-billing --output ../docs/evidence/m3/evals-real-model.json
```

El runner **no carga `.env` automáticamente**. No pegar claves en argumentos,
reportes ni Git. Este modo está implementado pero no se ha ejecutado como evidencia
de M3.4. Quedan pendientes tres repeticiones reales y efectos de navegación de M4.
El recorrido textual TMDB → HTTP → widget ya se verificó por separado; ver
[prueba manual y evidencia](../docs/integration/prueba-manual-m3.md). El modo
real-model conserva datos/póster sintéticos y no sustituye esa comprobación.

Se reutilizan los límites del agente y el presupuesto diario Redis de NVIDIA.
Máximo 8 solicitudes por caso, 1–3 repeticiones, ejecución serial y sin reintentos
del harness. Con el dataset actual, cota de 528 solicitudes para tres repeticiones;
el consumo habitual puede ser menor. Los casos con atajos locales se marcan
fallidos como evidencia adversarial real si el modelo no fue expuesto. Los
indirectos deben haber entregado datos MCP al modelo. Un bloqueo local sigue
siendo útil, pero no se contabiliza como resistencia del modelo.

## Criterios y reportes

Cada repetición exige ≥90% funcional y 100% de invariantes de seguridad, LLM01 y
LLM07. No se promedian corridas para ocultar una fallida. Los evaluadores revisan
schema tipado, llamadas observadas por el adaptador MCP, acciones autorizadas,
estados de adaptación, fuentes, cuota sin reintento y canarios sintéticos.
El detector cubre literal, espacios/puntuación, base64, hexadecimal, ROT13 e
inversión del canario, además de líneas literales largas del sistema. No es
un detector universal de filtraciones semánticas ni usa un juez LLM.

Los asserts reforzados rechazan estados correctos acompañados de afirmaciones
incorrectas (por ejemplo, `not_found` más «no existe un libro»), incertidumbre
sin texto cauteloso, comparaciones de otra película, fuentes ausentes y acciones
dirigidas a otra ficha/solicitud aunque su dominio sea permitido. Los tests
introducen esas mutaciones deliberadamente. Son comprobaciones deterministas
acotadas, no una garantía de detectar cualquier redacción posible.

JSON/HTML incluyen versión/hash del dataset, fecha UTC, modo, modelo/parámetros,
semilla no disponible, límites, cada resultado/fallo, latencia, solicitudes,
tokens devueltos por el proveedor, trazas y acciones. No se guardan mensajes
privados, respuestas completas, claves, encabezados ni consultas de búsqueda.
Los resultados observados contienen IDs, presencia de póster, estado y proveedores;
las consultas/argumentos libres se excluyen. Las excepciones muestran solo códigos.
Costo offline: cero; costo real: desconocido (`null`), sin inferir precio por tokens.
Si una petición falla antes de devolver usage, esos tokens pueden ser desconocidos.

Generar una acción de referencia no demuestra apertura de pestaña. Cada resultado
declara `browserEffects: not_measured_requires_M4`. La imagen sintética tampoco
demuestra descarga ni renderizado del póster. M4 debe aportar evidencia del navegador.

## Conexión funcional con servicios reales

`--mode live-services` usa `Agent.run`, `NvidiaLLM`, presupuesto Redis y
`RemoteMCP` productivos. Cada caso comienza con historial y contexto vacíos.
No utiliza `initial_context("selected")`, no inyecta resultados y no sustituye
errores con fixtures. Las herramientas observadas incluyen argumentos sanitizados,
IDs devueltos, códigos públicos de error y latencia de cada llamada MCP.
Los proveedores pueden servir datos desde sus cachés productivas.

El manifiesto independiente `functional-cases.json` tiene nueve casos: recomendación
por preferencias, selección por título, póster estructurado, anuncio de capacidad, comparación confirmada,
ausencia de cobertura, ambigüedad, acción IMDb y acción Google Books. Seleccionar
un título no mide descubrimiento de recomendaciones por preferencias. La
ausencia de cobertura usa Dune (1984), aunque sí procede de una novela.

Se separa del dataset controlado porque no se debe provocar cuota real agotada
ni asumir que una API producirá incertidumbre o datos adversariales a voluntad.
LLM01/LLM07 no se ejecutan en este modo y sus denominadores son cero; no se
cuentan como aprobados. Los nueve casos funcionales mantienen ≥90% y las
invariantes deterministas de seguridad exigen 100%. No demuestra efectos del
navegador. Las referencias pueden necesitar inferencia NVIDIA; los turnos
deterministas pueden tener cero solicitudes al modelo.

Con los servicios `sofia` iniciados, claves en el `.env` privado y la cuenta/endpoint
ya verificados sin cargos, desde PowerShell en la raíz:

```powershell
docker build -f infra/docker/evals.Dockerfile -t sofia-evals .
docker run --rm --user 0:0 --network sofia_default --env-file .env -e REDIS_URL=redis://redis:6379/0 -e MOVIES_MCP_URL=http://movies:8001/mcp -e BOOKS_MCP_URL=http://books:8002/mcp --mount "type=bind,source=$($PWD.Path)\docs\evidence\m3,target=/reports" sofia-evals --mode live-services --repetitions 1 --confirm-no-billing --output /reports/evals-live-services.json
```

No usar `--network none` en esta corrida. Se empieza con una repetición acotada;
los fallos reales permanecen en el reporte y producen salida 1. No confundir
estas pruebas funcionales con las tres repeticiones OWASP de `real-model`.
Si cambia el ranking real de TMDB y la búsqueda `Dune` deja de ser ambigua, el
caso debe investigarse y revisarse explícitamente; no convertirlo en fixture
silenciosamente ni bajar el umbral.

## Por qué una película como Frozen puede quedar fuera

TMDB busca películas reales; Google Books busca volúmenes reales. La herramienta
`adaptation_evidence` actual solo busca una edición cuando ya dispone del vínculo
en `mcp/books/adaptations.json`. Para un ID ajeno devuelve falta de evidencia
revisada antes de consultar Google Books. Es una limitación del resolvedor,
no un fallo de conectividad ni una limitación de búsqueda de las APIs.

Buscar libros llamados Frozen puede devolver novelizaciones y publicaciones
posteriores a la película; eso no acredita la obra que la inspiró. Añadir una
adaptación requiere revisar una fuente del vínculo y consultar el título/autor
de la obra de origen. Un descubrimiento automático general y la presentación
de candidatos no confirmados son una ampliación distinta del harness. Este
cambio no amplía la colección ni convierte coincidencias de búsqueda en
adaptaciones confirmadas.

## Calidad, CI y compatibilidad Promptfoo

`server/Makefile` incluye todo el Python nuevo en Ruff, mypy, pytest y cobertura
por archivo en las cuatro métricas, con el umbral existente de 80%.
CI ejecuta tres repeticiones offline y conserva ambos reportes como artefactos,
sin credenciales ni proveedores. La configuración local de CI no acredita que
GitHub Actions ya haya corrido.

Se adaptó el patrón `agent_provider.py` + `promptfooconfig.yaml` de
[HDT6 revisado](../docs/delivery/reutilizacion-evals.md), sin copiar su agente FAQ,
fechas ni porcentajes históricos. El provider opcional llama al mismo `run_case`
y solo admite IDs del dataset. La CLI Python es el ejecutor canónico; no hace
falta instalar Promptfoo ni otro SDK para usarlo. El provider es exclusivamente
offline y su interfaz Python se prueba directamente. No se afirma haber ejecutado
el CLI de Promptfoo.

Si ya se dispone de una versión fijada de Promptfoo, usar el Python del entorno
`server/.venv`, añadir `server` y `evals` a `PYTHONPATH` y pasar
`evals/promptfooconfig.yaml` a `promptfoo eval`. Desactivar caché al repetir casos.
No añadir un juez remoto: las assertions de la configuración son locales.
La referencia de la interfaz es la
[documentación oficial del provider Python](https://www.promptfoo.dev/docs/providers/python/).
