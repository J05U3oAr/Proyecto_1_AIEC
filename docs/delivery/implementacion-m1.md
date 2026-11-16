# Decisiones y evidencia de implementación de M1

Fecha: 15 de noviembre de 2026. Estado: módulo implementado y probado localmente;
aceptación de contratos y recorrido real del producto pendientes del equipo.

## Acuerdos con Diego

- Implementar toda la responsabilidad de M1, preservando frontend y propietarios.
- Un agente central, Python, Redis compartido y Compose para backend + Redis.
- Endpoint LLM gratuito y sin tarjeta obligatorio. Lightning principal, Super VL
  alternativa manual; ninguna conmutación automática a endpoints de pago.
- Explicar cambios y detenerse ante nuevas decisiones importantes de arquitectura,
  contratos, costos o dependencias. Detalles internos se verifican con pruebas.
- Commits autorizados explícitamente durante la implementación, con identidad
  `sallco <dcalderon918@gmail.com>`, una línea en español, sin scope ni atribuciones.
  Esta instrucción de sesión prevalece sobre la prohibición anterior de AGENTS.
- Mantener `.env.example` sincronizado con las opciones; nunca con secretos.

## Decisiones concretas

1. Schemas neutrales publicados desde los validadores runtime; un check detecta
   divergencias. JSON Schema valida estructura y Python añade política semántica
   de URLs, IDs y evidencia. Consumidores deben replicar esas invariantes.
2. Sesión: ID opaco y token independiente; solo se guarda hash de token. Historial
   de 20 mensajes, TTL 30 minutos, últimas 20 respuestas deduplicadas. El cliente
   antiguo obtiene sesión nueva por llamada, conservando `{ prompt } → { response }`.
3. Redis real, operaciones Lua atómicas y reserva de turno superior a su timeout.
   Pruebas entre instancias verifican presupuesto y exclusión. No se promete
   exactly-once ante caída de proceso ni alta disponibilidad del Redis local.
4. MCP Streamable HTTP con SDK oficial 1.30.0, sin redirecciones. Endpoints del
   operador, argumentos y resultados acotados; ninguna herramienta fetch/shell.
5. LLM mediante HTTPX, sin reintentos automáticos ni framework agéntico. El primer
   probe obtuvo tool calling pero no devolvió texto final en la segunda llamada;
   el cierre fuerza `tool_choice=none` en la última llamada. La prueba corregida pasó.
6. Si falla libros, conservar película y declarar fallo parcial; no convertirlo
   en ausencia de adaptación. No inventar diferencias a partir de metadatos.
7. Navegación conservadora: intención actual explícita más gramática de orden y
   recurso verificado. M4 debe resolver deduplicación y activación del navegador.
8. Dockerfile específico con allowlist de contexto, sin `.env`, usuario no root
   y puertos en loopback. Configuración sensible solo al arrancar.

## Verificaciones realizadas

- Python 3.12.15, dependencias en `uv.lock`, Redis 7.4 local con Docker.
- Probe NVIDIA: cuatro solicitudes reales en total; primera pareja autenticó y
  llamó `search_movies`, pero no cerró en texto. Segunda pareja pasó. No se imprimió
  clave, texto del modelo ni cuerpo del proveedor. Las cuatro cuentan al presupuesto.
- Catálogo del probe sintético vacío: **no acredita TMDB/Books ni comparación real**.
- Cliente MCP independiente listó e invocó una herramienta mediante HTTP real
  contra FastMCP sintético. Prueba además cliente productivo y fallo sanitizado.
- Cobertura y tests: ver [README](../../server/README.md) para repetir `make check`; reportes
  locales `coverage.json`/`coverage.xml` no se versionan. Resultado: **120 pruebas
  aprobadas**, líneas/sentencias **98,62%**, ramas **94,33%**, y ≥80% en las cuatro
  métricas **por archivo**, incluidos scripts. Ruff, formato, mypy estricto y
  verificación de schemas aprobados. Funciones: entrada al primer statement
  ejecutable, según el script descrito en README (mínimo observado 92,31%).
- Imagen construida y auditada sin red/credenciales del usuario: `.env` ausente
  en `/app`, `NVIDIA_API_KEY` ausente en configuración de imagen, UID distinto de 0.
- Compose del backend + Redis pasó health checks; HTTP real local
  `GET /health/ready` devolvió `200 {"status":"ok"}` sin llamadas al modelo.
- Frontend sin modificaciones: lint y formato aprobados; 57 tests aprobados;
  cobertura global 95,79% sentencias, 91,50% ramas, 95,12% funciones y 96,06% líneas;
  build de aplicación/SDK y E2E JSDOM aprobados. El build de aplicación conserva
  el aviso de bundle mayor de 500 KiB. No se ajustó el umbral ni se ocultó el aviso.
- El sandbox impidió conexiones locales/red; las ejecuciones verificadas usaron
  autorización para Docker, descargas y pruebas locales. No se alteraron umbrales.

## Entrega a los compañeros

| Responsable | Acuerdo / trabajo pendiente                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Hugo (M2)   | Revisar tools/schema/transporte, implementar MCP películas, cuotas/caché proveedor y autenticar infraestructura; integrar Compose y CI       |
| Pedro (M3)  | Revisar evidencia de adaptación y tools libros; adaptar su harness al mismo `Agent.run`, incorporar casos entregados y ejecutar evals reales |
| Arodi (M4)  | Consumir contrato/sesión y errores, seleccionar modo real sin MSW, renderizar datos y ejecutar acciones con validación y prueba de navegador |
| Diego (M1)  | Revisar contratos con consumidores, conectar herramientas reales cuando estén disponibles y corregir hallazgos de integración/evals          |

No marcar como satisfechos los criterios integrados de M1 hasta observar widget,
MCP/TMDB/Books y evals reales. Pruebas de aislamiento y cuota no sustituyen el
ensayo de rendimiento/escala de M2. La preparación final debe incluir revisión
humana y explicación de cinco minutos del recorrido y un ataque bloqueado.

## Guion de defensa de cinco minutos

1. **0:00–1:00 — Recorrido.** El widget conserva `IChatService` y envía `prompt`.
   FastAPI valida, autoriza sesión y entrega el turno al agente. El agente propone
   una tool, el cliente MCP consulta al servicio de películas/libros y valida el
   resultado. La respuesta conserva texto y añade datos enriquecidos opcionales.
2. **1:00–2:00 — Estado.** Explicar que ID no equivale a autorización: se necesita
   el token separado. Redis comparte historial/contexto entre réplicas, expira
   sesiones y serializa turnos; requestId recupera resultados sin repetir un turno
   ya completado. Aclarar la ventana de 20 IDs y las limitaciones ante caídas.
3. **2:00–3:00 — Herramientas y evidencia.** Mostrar schemas y un fixture de
   película. Una coincidencia de título no confirma adaptación: se requiere libro
   y evidencia. El veredicto es subjetivo; una fuente caída es distinta de no
   encontrar libro. Abrir una referencia requiere intención y ejecución de M4.
4. **3:00–4:00 — Ataque.** Ejecutar el test
   `test_indirect_injection_does_not_authorize_navigation_or_shell`: una sinopsis
   pide ejecutar shell y abrir un host externo. El dato sigue en rol tool; la
   allowlist bloquea shell antes de MCP. La traza registra el bloqueo. Para LLM07,
   mostrar el canario sintético y explicar por qué el filtro literal no garantiza
   bloquear traducciones/codificaciones; esas variantes corresponden a evals reales.
5. **4:00–5:00 — Escala y evidencia.** Recorrer los dos diagramas. Añadir procesos
   permite concurrencia entre sesiones, no aumenta la cuota. Redis único y LLM
   son límites explícitos. Diferenciar los 120 tests, el transporte MCP sintético
   y las cuatro llamadas NVIDIA reales de la demo integrada y evals aún pendientes.
