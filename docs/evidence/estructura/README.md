# Verificación de la reorganización

Fecha local: 15/11/2026 (America/Guatemala).
[Resultados estructurados](checks.json).

## Antes y después

| Control local                                        | Antes                 | Después               |
| ---------------------------------------------------- | --------------------- | --------------------- |
| Python backend/contratos/MCP                         | 248 pruebas aprobadas | 248 pruebas aprobadas |
| Ruff, formato, mypy, schemas y cobertura por archivo | Aprobados             | Aprobados             |
| Frontend                                             | 70 pruebas aprobadas  | 70 pruebas aprobadas  |
| E2E JSDOM                                            | 1 prueba aprobada     | 1 prueba aprobada     |
| Lint y formato frontend/configuración                | Aprobados             | Aprobados             |
| Build aplicación y SDK                               | Aprobados             | Aprobados             |

Se mantienen los umbrales ≥80% de líneas, sentencias, ramas y funciones por archivo
Python. El contenido del código Python/TypeScript/CSS, las dependencias y los exports
no cambió. Los dos Dockerfiles conservan exactamente sus instrucciones originales.
Persiste el aviso previo de Vite sobre el chunk de aplicación mayor de 500 kB.

## Infraestructura y sesión

- Comparación de `docker compose config --format json` con `.env.example`:
  base, overlay TLS y pruebas equivalentes; únicamente cambia la ubicación
  prevista de Dockerfiles. No se guardaron configuraciones expandidas con secretos.
- Imágenes backend/películas reconstruidas y servicios recreados desde `infra/`.
  `npm run start:services` y el arranque del Redis de pruebas funcionan.
- Sesión real de Cars 2 creada antes de recrear backend/MCP; después, mismo ID de
  sesión y metadatos al pedir su puntuación. Redis y sus datos se conservaron.
  La sesión HTTP de esta prueba se eliminó al terminar.
- Saludo, rechazo de código y recuperación del contexto correctos; readiness de
  backend/MCP devuelve 200 y MCP sin token devuelve 401.
- Ambas imágenes mantienen UID 10001, sin credenciales en la configuración de
  imagen y sin archivos `.env` copiados en las rutas de aplicación verificadas.
- `caddy validate` pasó usando el montaje nuevo. No se abrió un gateway adicional,
  no se instaló una CA ni se desactivó la validación TLS. Esto no acredita una
  solicitud HTTPS completa.

## Navegador

- [Widget real](widget-real.jpg): nueva consulta Cars 2 y seguimiento de duración,
  con géneros, minutos, puntuación TMDB y votos visibles.
- [Demostración MSW](widget-mock.jpg): escenario de tabla Markdown completado.

Las consultas de catálogo usan el MCP productivo y datos TMDB cacheados; estos
recorridos no requirieron nueva inferencia LLM. No se presentan como evals de
seguridad ni de libros. La revisión adicional de solo lectura no encontró
referencias rotas ni cambios funcionales inadvertidos en la configuración revisada.

Los enlaces/documentos y formato se comprobaron tras la reorganización. Los
reportes/capturas históricos de M2 se conservaron sin modificar sus bytes.
No se acreditan CI remoto, clon limpio, revisión humana, protección de `main` ni
implementación de libros/evals. No se hicieron commits, push o merge.
