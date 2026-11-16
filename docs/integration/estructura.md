# Estructura del repositorio y cambio de rutas

El código mantiene sus límites: `src/` para frontend/SDK, `server/` para backend,
`mcp/` para herramientas y utilidades, `shared/contracts/` para schemas. Toda la
configuración de contenedores está en `infra/`; la documentación técnica está en
`docs/`. Los README operativos permanecen junto al módulo.

`mcp/books/` y `evals/` son ubicaciones reservadas para M3 con un README de inicio;
no contienen un servidor o harness funcional ni servicios ficticios en Compose.

## Comandos después del cambio

Desde la raíz, con `.env` local ya configurado:

```bash
npm run start:services
npm run dev:real
```

El primer comando equivale a arrancar `infra/compose.yaml` con el proyecto
`sofia`. Mantiene los mismos servicios, puertos, variables y volumen Redis.
`npm run stop:services` usa el mismo archivo y conserva el volumen.

Redis de pruebas y checks Python:

```bash
docker compose -p sofia-m2-test -f infra/compose.test.yaml up -d --wait
npm run check:python
```

La configuración Python y `uv.lock` siguen en `server/`, usados por backend/MCP;
primero instalar con `cd server && uv sync --frozen --python 3.12`. Se conservan
imports, entornos de ejecución y los comandos actuales, sin migración de paquetes.

TLS local opcional:

```bash
docker compose --env-file .env -p sofia -f infra/compose.yaml -f infra/compose.tls.yaml up --build -d --wait
```

El montaje Caddy se resuelve desde el directorio del Compose base (`infra/`).
La CA sigue siendo local y de confianza explícita del operador. No se desactiva
la validación TLS ni se cambia el acceso de servicios a loopback.

## Integración y referencias

- Scripts npm, workflow CI y guías usan `infra/compose*.yaml`.
- Dockerfiles e ignores se agrupan en `infra/docker/`; el contexto continúa en la
  raíz y las rutas `COPY server/...`, `COPY mcp/...` y `COPY shared/...` conservan
  su significado. Los secretos no entran al contexto permitido de las imágenes.
- Los documentos de asignación están en `docs/delivery/`, las guías en
  `docs/integration/` y las capturas/reportes en `docs/evidence/`.
- `AGENTS.md` conserva las reglas vigentes, incluida la prohibición de commits
  de IA. `INSTRUCTIONS.md` permanece sin cambios.
- Los checkpoints de M3/M4 siguen pendientes donde no haya evidencia propia.
  Reorganizar carpetas no acredita funcionalidades futuras.

## Verificación

El cierre de esta reorganización requiere comparar los checks antes/después,
construir y arrancar servicios desde las rutas nuevas, verificar autenticación
MCP/readiness, conservar una sesión tras recrear backend/MCP y comprobar que la
configuración efectiva base/TLS/pruebas solo cambia las rutas esperadas.
Los resultados se registran en [la verificación de estructura](../evidence/estructura/README.md).
