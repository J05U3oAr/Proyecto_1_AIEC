# Rama `feat/m4-widget-ux`

Trabajo del miembro 4, Arodi Chávez. La carpeta reproduce el nombre de la rama
como ruta: `docs/branches/feat/m4-widget-ux/`.

## Primera etapa: créditos y atribución

Los tres commits se organizan por dependencias, conservando cada componente junto
con sus pruebas. Los dos primeros son `543d751` y `6f08771`; este índice se
incorpora junto con la tercera porción. El hash de ese tercer commit y el resultado
del push se verifican después de crearlo, mediante Git.

| Orden | Commit                                                          | Detalle                                             |
| ----- | --------------------------------------------------------------- | --------------------------------------------------- |
| 1     | `chore(m4): add official provider attribution assets`           | [Recursos oficiales](01-recursos-oficiales.md)      |
| 2     | `feat(m4): add accessible provider credits with tests`          | [Componente y pruebas](02-componente-creditos.md)   |
| 3     | `feat(m4): integrate credits into widget and document delivery` | [Integración y evidencia](03-integracion-widget.md) |

Consultar los hashes reales con:

```bash
git log --oneline main..feat/m4-widget-ux
```

Cada documento se incorpora en el mismo commit que explica. No se incluye el
hash del propio commit dentro de su contenido, porque el hash depende de esos
mismos bytes. Git conserva la asociación entre documento, mensaje y cambios.

Esta etapa no cierra el trabajo de M4. Continúan pendientes la integración
enriquecida, atribución junto a los resultados de libros, navegación segura y
evidencia en navegador real. Ver [evidencia de etapa](../../../delivery/implementacion-m4-etapa-1.md)
y [tareas M4](../../../delivery/miembro-4-widget-ux.md).

La revisión automática bloqueó inicialmente el primer commit por `AGENTS.md`.
El usuario autorizó después explícitamente una excepción limitada a estos tres
commits y al push de esta rama a `origin`. Con esa aclaración se pudo crear el
primer commit y continuar. El `.env` no se incorpora al repositorio.

## Inspección del trabajo

Desde la raíz del repositorio, estos comandos permiten revisar el contenido
de cada commit y la asociación con su documento:

```powershell
git log --oneline main..feat/m4-widget-ux
git show --stat 543d751
git show --stat 6f08771
git show --stat feat/m4-widget-ux
git status --short --branch
git ls-remote --heads origin feat/m4-widget-ux
```

El último comando consulta GitHub para comparar el hash remoto con el local;
no consume consultas de TMDB, Google Books ni del modelo.
