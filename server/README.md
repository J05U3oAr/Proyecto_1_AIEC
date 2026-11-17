# Backend de Sofía — miembro 1

[Índice de documentación](../docs/README.md).

Python 3.12+, `uv`, Docker y Compose. Frontend conservado; no se instalaron
dependencias servidor en el SDK. Los contratos neutrales están en
[`shared/contracts`](../shared/contracts/README.md); M2 ya verificó compatibilidad de las tools de películas;
la aceptación de M3/M4 sigue pendiente. Ver [decisiones y evidencia](../docs/delivery/implementacion-m1.md).

## Configuración y arranque

Desde la raíz, si aún no existe `.env`, copiar `.env.example` y colocar la clave
NVIDIA solo en `.env`. No sobrescribir un `.env` existente. Nunca prefijar secretos
con `VITE_`. El ejemplo contiene todas las opciones, con credenciales vacías.

Backend + Redis + MCP películas (M2):

```bash
docker compose --env-file .env -p sofia -f infra/compose.yaml up --build -d
```

API: `http://localhost:8000`, documentación: `/docs`, checks: `/health/live` y
`/health/ready`. Readiness comprueba Redis; no consume LLM ni garantiza proveedores.
Apagar con el mismo comando Compose seguido de `stop`; conserva sesiones en el
volumen. No eliminar volúmenes salvo que se quiera borrar contexto.

Compose recibe variables de `.env` **al arrancar**, nunca en el build; cada servicio
recibe solo sus opciones explícitas. `MCP_TOKEN` autentica backend y MCP. Redis tiene
una dirección interna sin credenciales para esta red local. Puertos publicados
solo en loopback, imagen sin root, contexto de build por allowlist. Un operador
con acceso a Docker puede inspeccionar variables de contenedores: no compartir
`docker inspect` ni `docker compose config` expandido. Antes de publicar a red,
M2 debe configurar TLS, autenticación y aislamiento de infraestructura.

El MCP de películas ya está en Compose como `movies:8001/mcp`. El de libros
`books:8002/mcp` incluye búsqueda/detalles de M3.1 y evidencia de adaptación de M3.2;
comparación y evals siguen pendientes. Ver [configuración](../mcp/books/README.md).
Para destinos de contenedores diferentes,
exportar `MOVIES_MCP_CONTAINER_URL`/`BOOKS_MCP_CONTAINER_URL`; las variables
`MOVIES_MCP_URL`/`BOOKS_MCP_URL` son del host y no reemplazan la red interna.
Ver [operación M2](../mcp/README.md) e [infraestructura](../infra/README.md).

Desarrollo Python local, después de levantar solo Redis:

```bash
docker compose -p sofia-m1 -f infra/compose.yaml up -d redis
cd server
uv sync --frozen --python 3.12
uv run --frozen --env-file ../.env uvicorn sofia.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

Petición compatible con fase 1:

```bash
curl http://localhost:8000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Recomiéndame ciencia ficción"}'
```

Una recomendación requiere MCP películas disponible. Sin él se devuelve un error
público, no una película inventada. `X-Session-Token` es confidencial: no copiarlo
a reportes. Enviar cabecera y `sessionId` en seguimientos, conforme al contrato.

## Pruebas reproducibles

Redis aislado para pruebas, sin volumen ni llamadas externas:

```bash
docker compose -p sofia-m1-test -f infra/compose.test.yaml up -d --wait
cd server
uv sync --frozen --python 3.12
make check
```

`make check`: Ruff, formato, mypy estricto, schemas sin divergencias, pytest,
cobertura y umbrales por archivo. No carga `.env` ni llama a NVIDIA. Usa Redis
`localhost:16379/15`; `REDIS_TEST_URL` permite un Redis de pruebas alternativo.
Las pruebas borran solo claves creadas durante cada caso. Reservar esa instancia
para pruebas, sin tráfico concurrente ajeno. El servidor MCP sintético usa
`127.0.0.1:18081`, se inicia y termina dentro del test.

Cobertura incluye **todo** `sofia/`, los scripts operativos y los módulos actuales
de películas/caché en `mcp/`. coverage.py mide
sentencias ejecutables por línea, por lo que líneas/sentencias coinciden; ramas
se miden por arcos. El script adicional cuenta entrada al primer statement
ejecutable de cada función, incluidas funciones anidadas; omite únicamente
declaraciones de protocolo sin implementación. Exige ≥80% en cada métrica por
archivo, sin compensar un módulo débil con otro.

Prueba real opcional, **máximo dos solicitudes por ejecución**:

```bash
cd server
uv run --frozen python -m scripts.probe_nvidia --confirm-free-endpoint
```

Este script sí lee `.env`, contabiliza solicitudes en el Redis de desarrollo y
no imprime claves, cuerpos del proveedor ni texto generado. Verificar primero
que el modelo siga con endpoint gratuito y acceso sin tarjeta. La prueba usa un
catálogo vacío sintético: acredita autenticación/tool calling, no TMDB/libros.
No ejecutarla repetidamente para medir cobertura.

## Integración y evals

- M2 integró estos comandos, cobertura por archivo, SDK y contenedores en CI;
  ver [evidencia y limitaciones de M2](../docs/delivery/implementacion-m2.md).
- M3 invoca `Agent.run` con los mismos adaptadores de producción. Recibe
  `TurnResult.response`, `trace` y `usage`; los errores `PublicError` también
  conservan observaciones sanitizadas. No enviar trazas al navegador.
- [`evaluation_cases.json`](evaluation_cases.json) aporta funcionalidad y cuatro
  ataques LLM01/LLM07 para su harness; no es evidencia de eval real ejecutada.
- M2 añadió `npm run dev:real` para evitar MSW. El cliente ya conserva la sesión
  HTTP en memoria y la elimina al reiniciar; ver [flujo conversacional](../docs/integration/conversacion.md).
  M4 completa las tarjetas y acciones enriquecidas con validación y deduplicación.

Datos de catálogo, sinopsis e historial son no confiables. Herramientas acotadas,
schemas y URLs se validan en código. Ningún control requiere secretos dentro del
prompt. Los canarios sintéticos son exclusivos de evaluación. El filtro literal
de salida no garantiza bloquear filtración traducida/codificada; M3 debe medirlo.
