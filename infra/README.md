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
M3.1 incorpora `infra/docker/books.Dockerfile` y el servicio `books`, con clave
privada `GOOGLE_BOOKS_API_KEY`, MCP autenticado y health checks sin consultas a Google.
Ver [configuración y prueba explícita](../mcp/books/README.md).
M3.2 añade evidencia de adaptación con colección JSON revisada incluida en la
imagen. M3.3 incorpora premisas revisadas y comparación acotada en el agente M1.
La imagen backend incluye `scripts.probe_comparison`, con modo HTTP y modo de
identidad revisada sin TMDB/LLM; ver el README de libros. `evals/` continúa pendiente.

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

### Entrega continua a GitHub Pages

Al actualizar `main`, el pipeline primero ejecuta los tres checks de CI. Si
pasan y la publicación está habilitada, empaqueta el frontend para la ruta de
Pages y lo publica en el entorno `github-pages`. Los PR conservan sus checks y no
publican. GitHub Pages sirve el frontend; el backend, Redis y los MCP requieren
infraestructura separada. Esta fase no publica el SDK como paquete.

Activación por un mantenedor:

1. Tener el backend operativo en HTTPS. Configurar `ALLOWED_ORIGINS` con el
   origen de Pages (por ejemplo, `https://j05u3oar.github.io`, sin incluir la
   ruta del repositorio). Redis, MCP y credenciales quedan en servidor.
2. En **Settings → Pages → Build and deployment**, elegir **GitHub Actions**.
   Restringir el entorno `github-pages` a `main` en **Settings → Environments**.
3. En **Settings → Secrets and variables → Actions → Variables**, crear
   `VITE_CHAT_ENDPOINT` con la URL pública completa de chat, por ejemplo
   `https://backend.example.org/api/chat`, y `PAGES_CD_ENABLED` con valor
   `true`. La URL se incluye en el bundle, así que no debe contener secretos.
4. Después del merge, revisar **Actions → CI Pipeline**. Si se activó Pages
   después del merge, ejecutar **Run workflow** sobre `main` para volver a pasar
   CI y publicar el commit actual. Abrir la URL del entorno y enviar una
   recomendación desde el widget para verificar HTTPS, CORS y respuesta real.

Para pausar nuevas publicaciones, cambiar `PAGES_CD_ENABLED` a `false`.
La versión ya publicada sigue disponible. Para volver a una versión anterior,
revertir el cambio mediante un PR; el flujo publica de nuevo tras pasar CI. El
job rechaza artefactos de corridas que ya no corresponden a la punta de `main`.

La suite Python usa Redis separado en `16379`, bases 14/15 y namespaces propios.
Las pruebas solo borran claves que crearon. No apuntarlas a un Redis con datos
reales ni correr varios suites ajenos sobre esa instancia simultáneamente.

M3.1 incluye libros en `server/pyproject.toml` (coverage/mypy), `server/Makefile`
y su servicio/healthcheck en Compose y CI. Cuando
exista el runner de evals, añadir sus casos deterministas sin red al CI; la corrida
real acotada produce evidencia separada. No crear un stub de libros que se haga
pasar por el módulo terminado.

El mantenedor debe exigir los tres jobs y al menos una revisión ajena al autor
en protección de main. Este trabajo no modifica reglas remotas, no crea commits,
no sube ramas y no despliega públicamente.
