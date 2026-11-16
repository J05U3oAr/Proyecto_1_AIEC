# Evidencia y decisiones M2

Fecha: 15 de noviembre de 2026. Implementación en `feat/mcp`, sin commits del agente.
Los resultados finales se completan después de ejecutar los controles, no por
haber escrito este documento.

## Revisión de M1 y decisiones de integración

- Base de M1: 120 tests pasaron antes de incorporar M2. Frontend: 57 tests y
  cobertura global superior a 80% en las cuatro métricas antes de los cambios.
- Se aceptan los contratos v1 para las tools de películas: nombres, argumentos,
  límites, `structuredContent` y políticas de URL. No se alteran schemas publicados.
- Reutilización del SDK oficial MCP 1.30.0 ya bloqueado por M1. Servidor de bajo
  nivel para publicar exactamente los schemas existentes y validar argumentos
  estrictos, sin coerción implícita ni mensajes que revelen inputs.
- Servicio replicable sin sesión MCP; Redis comparte caché/cuota entre procesos.
  No se añade un segundo almacén ni dependencia Python. El lockfile se conserva.
- La única ampliación de M1 es traducir errores MCP revisados de cuota/timeout a
  sus errores HTTP públicos. Casos antiguos siguen normalizándose como proveedor
  no disponible. Cambios acompañados por tests del consumidor.
- Modo frontend explícito con default mock preservado y proxy `/api` en desarrollo.
  No se implementan las tarjetas, sesiones del cliente ni navegación de M4.
- Compose privado local con token MCP, healthchecks e imágenes sin secretos.
  Se ofrece gateway TLS local opcional; no se publica ningún servicio externo.

## Verificación ejecutada

- `make -C server check`: **184 tests** aprobados, Ruff, mypy estricto, contratos
  sin divergencias y cuatro métricas ≥80% por archivo. Cobertura combinada
  líneas/ramas: **97.62%**. Los archivos nuevos tienen ≥91% de ramas salvo
  archivos sin ramas, con funciones al 100%.
- El medidor heredado de funciones contaba `nonlocal` como línea ejecutable y
  reportaba falsos negativos en closures. Se reprodujo y corrigió omitiendo
  únicamente declaraciones `global`/`nonlocal`; no se modificaron umbrales ni
  exclusiones de código productivo. Test de regresión incluido.
- Frontend: **60 tests**, E2E Vitest/JSDOM existente aprobado, lint/formato y
  build de app y SDK correctos. Cobertura de sentencias 95.85%, ramas 92.03%,
  funciones 95.18% y líneas 96.12%. El build conserva el aviso de chunk grande;
  no se alteraron límites para ocultarlo.
- `npm audit --omit=dev --audit-level=high`: cero vulnerabilidades reportadas
  en dependencias de producción. No se añadieron dependencias al proyecto.
- Imágenes backend/películas construidas con lockfile. Redis, backend y MCP
  saludables; una petición MCP sin token recibe 401. Gateway local Caddy
  verificado por HTTPS con CA pública explícita (`--cacert`), sin instalar CA
  ni desactivar verificación TLS. Solo puertos loopback.
- Cliente MCP independiente (transporte HTTP real) lista/invoca herramientas y
  el consumidor `RemoteMCP` de M1 valida los resultados. Probe **real TMDB**
  obtuvo la película 438631 con póster/IMDb; búsqueda real retornó IDs válidos.
- Un `Agent.run` real con NVIDIA + MCP + TMDB completó recomendación, dos llamadas
  LLM y traza `search_movies: ok`. Las solicitudes reales usan cuota compartida.
  Esto no acredita por sí solo estabilidad de todas las conversaciones.
- También hubo fallos reales: ID solicitado sin catálogo previo fue rechazado
  como `unverified_resource`; otros intentos HTTP devolvieron
  `upstream_unavailable` e `invalid_llm_result`. Se conservaron en
  [live-check.json](evidence/live-check.json), sin descartar fallos. No se
  cambiaron controles de M1 para forzar respuestas exitosas.
- Navegador real: demo MSW preservada (tabla visible) y modo real conectado,
  cuyo turno observado respondió de forma conservadora que no tenía recurso
  verificado. Las capturas [mock](evidence/mock-browser.jpg) y
  [real](evidence/real-browser.jpg) documentan ese alcance; no se presentan como
  una tarjeta/póster de M4 ya implementada. Chrome DevTools MCP no estaba
  disponible; se usó el navegador integrado para esta revisión visual.
- Carga offline: 40 consultas, concurrencia 8, dos clientes de caché en un
  proceso, **5 consultas al proveedor simulado, 0 errores**, p50 0.384 ms y
  p95 58.975 ms en esta máquina.
  [Medición](evidence/benchmark.json). Otra prueba usa **dos procesos Python**
  y verifica que comparten exactamente siete permisos de una cuota de siete.
- Revisión independiente de solo lectura: encontró un límite de candidatos
  aplicado antes de descartar géneros. La prueba nueva falló antes y pasó tras
  corregir el contador; el revisor confirmó la corrección.

Resultados resumidos en [quality-summary.json](evidence/quality-summary.json).
Las ejecuciones locales no equivalen a un run remoto de GitHub Actions: estos
cambios permanecen sin commits, sin push y sin modificación de protección remota.

## Límites y siguientes responsables

- M3 implementa MCP libros y harness de evals; debe reutilizar el presupuesto con
  namespace distinto y validar antes de cachear. CI ya cubre los módulos Python
  actuales; añadir explícitamente sus rutas a tipos y cobertura al incorporarlos.
- M4 completa consumo enriquecido/sesión en SDK, Créditos oficiales y evidencia
  de póster y apertura real del navegador. La prueba visual integrada depende de ello.
- El mantenedor debe comprobar protección remota de `main` y checks requeridos;
  preparar CI no equivale a que GitHub haya ejecutado/aprobado este diff.
- Redis local es único; su persistencia no es alta disponibilidad. Más réplicas
  permiten concurrencia, no más presupuesto TMDB/LLM. No hay exactly-once ante
  caída de proceso; los retries se contabilizan y las tools solo consultan.

## Estado de M2

M2.1–M2.3 implementados y verificados. M2.4 implementa operación/CI de los
módulos actualmente existentes, modo real sin MSW y gateway local opcional.
La prueba global widget con tarjetas, ambos MCP/evals y checks remotos depende
de M3/M4 y de la revisión humana; esos criterios globales no se marcan completos.
La variabilidad del LLM observada es un pendiente de integración M1/M3, no se
confunde con una falla de autenticación o del transporte MCP probado.

## Aclaración del cierre de aceptación (15/11/2026)

M2 no tiene todavía todos sus criterios de aceptación cerrados. La documentación
de registro/créditos y la comprobación de secretos sí están cumplidas; se corrigió
su checkbox omitido. Permanecen pendientes el arranque acreditado desde un clon
limpio, CI de la integración completa, protección/revisión humana en GitHub y
un recorrido HTTP/widget estable de recomendación real. Los éxitos de MCP y
`Agent.run` no se presentan como sustitutos de esas pruebas. La auditoría
criterio por criterio está en
[la guía de M2](../tasks/miembro-2-peliculas-infra.md).

## Corrección posterior del flujo conversacional

La [verificación de conversación](../server/CONVERSACION.md) documenta el arreglo
de saludos, capacidades y continuidad de sesión, con evidencia HTTP/TMDB y en
navegador. El cliente ahora conserva la sesión en memoria; M4 mantiene a su cargo
las tarjetas, Créditos y acciones enriquecidas. Los resultados históricos de
este documento se conservan y no describen por sí solos el estado posterior.
