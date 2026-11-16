# Operación local de M1 + M2

[Índice de documentación](../docs/README.md).

Requisitos: Node 22, npm, Docker Compose y, para checks Python locales, uv/Python
3.12. Desde un clon limpio: `npm ci`, crear `.env` a partir de `.env.example` si no
existe, configurar tokens y ejecutar `npm run start:services`. No copiar un `.env`
encima de otro. El token MCP es compartido, TMDB y NVIDIA son privados de servidor.
Ver [MCP README](../mcp/README.md) para registro académico y comandos de diagnóstico.

`npm run dev` conserva simulación de fase 1. `npm run dev:real` no inicia MSW y
redirige `/api` al backend local. El SDK todavía necesita la integración enriquecida
de M4; las herramientas y datos del backend no equivalen a una tarjeta ya visible.

## Archivos de infraestructura

- `infra/compose.yaml`: backend, películas y Redis; contexto de build en la raíz.
- `infra/compose.test.yaml`: Redis de pruebas, sin datos de desarrollo.
- `infra/compose.tls.yaml` y `infra/Caddyfile`: gateway opcional.
- `infra/docker/backend.Dockerfile` y `infra/docker/movies.Dockerfile`: imágenes.
  Cada Dockerfile tiene su `.dockerignore` específico al lado; mantener la
  allowlist y las exclusiones de secretos al modificarla.

Ejecutar los comandos documentados desde la raíz. Los scripts npm y GitHub Actions
ya usan estas rutas. Mantener `-p sofia` para reutilizar el proyecto y volumen de
sesiones existentes; cambiar de nombre de proyecto crearía otros recursos.
La ubicación nueva no requiere borrar contenedores ni volúmenes con `down -v`.
Para M3, incorporar su Dockerfile en `infra/docker/` y su servicio aquí cuando esté
implementado; `mcp/books/` y `evals/` contienen por ahora solo guías de inicio.

## Límites de red y TLS

Compose solo publica puertos en loopback. Redis y MCP no deben exponerse a Internet;
MCP exige token y rechaza Origin de navegador y hosts fuera de allowlist. Una red
Docker compartida implica confianza de operador: no añadir servicios desconocidos.

Gateway TLS local opcional:

```bash
docker compose --env-file .env -p sofia -f infra/compose.yaml -f infra/compose.tls.yaml up --build -d --wait
```

La API queda también en `https://localhost:8443`, con certificado de CA local
Caddy. El operador decide si confía esa CA en su equipo; no se instala confianza
automáticamente ni se desactiva validación TLS de clientes. Para un despliegue
externo hacen falta dominio/certificado válido, cerrar puertos directos y configurar
orígenes/autenticación y credenciales del almacén según el entorno. El archivo es
una opción local, no una declaración de preparación universal para producción.

Parar con `npm run stop:services`; si se añadió gateway, usar el mismo conjunto de
archivos Compose con `stop`. No usar `down -v` como rutina: eliminaría sesiones.
No pegar `docker inspect` ni `docker compose config` expandidos en reportes, porque
contienen variables sensibles.

## CI y evidencia de calidad

El workflow tiene tres jobs: `Frontend and SDK`, `Backend, contracts and MCP` y
`Service images and readiness`. Ninguno usa claves de proveedores. El último
usa valores sintéticos para checks de configuración/readiness y autenticación;
no demuestra conectividad de TMDB o LLM.

La suite Python usa Redis separado en `16379`, bases 14/15 y namespaces propios.
Las pruebas solo borran claves que crearon. No apuntarlas a un Redis con datos
reales ni correr varios suites ajenos sobre esa instancia simultáneamente.

Cuando M3 agregue el MCP libros, incluir sus rutas de código en `server/pyproject.toml`
(coverage/mypy), `server/Makefile` y su servicio/healthcheck en Compose. Cuando
exista el runner de evals, añadir sus casos deterministas sin red al CI; la corrida
real acotada produce evidencia separada. No crear un stub de libros que se haga
pasar por el módulo terminado.

El mantenedor debe exigir los tres jobs y al menos una revisión ajena al autor
en protección de main. Este trabajo no modifica reglas remotas, no crea commits,
no sube ramas y no despliega públicamente.
