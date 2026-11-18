# Commit 1: recursos oficiales de atribución

Rama: `feat/m4-widget-ux`. Responsable: Arodi Chávez (miembro 4).

Mensaje: `chore(m4): add official provider attribution assets`.

## Objetivo

Preparar los gráficos oficiales que utilizará la interfaz para identificar las
fuentes de películas y libros. Se almacenan en el repositorio para no descargar
logos desde los proveedores cada vez que se renderiza el widget.

## Archivos incorporados

- `src/assets/attribution/tmdb.svg`: logo oficial corto de TMDB en sus colores
  originales, con su `viewBox` y proporción originales.
- `src/assets/attribution/google-books-poweredby.png`: gráfico oficial
  «Powered by Google», conservado sin editar sus bytes.
- Este documento: procedencia, alcance y comprobaciones del primer commit.

Los archivos todavía no se muestran por sí solos. El siguiente commit incorpora
el componente que los importa y el tercero lo conecta al widget/SDK.

## Procedencia y condiciones

- [Guía TMDB](https://developer.themoviedb.org/docs/faq) y
  [logos aprobados](https://www.themoviedb.org/about/logos-attribution).
  [SVG original](https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg).
- [Guía Google Books](https://developers.google.com/books/branding) y
  [PNG original enlazado por la guía](https://books.google.com/googlebooks/images/poweredby.png).

Las fuentes se consultaron el 17/11/2026. Los gráficos no adquieren una licencia
genérica por estar dentro del proyecto: su uso sigue sujeto a las condiciones
de marca del proveedor. No se reconstruyeron con texto ni se recolorearon.

## Comprobaciones

SHA-256 tras descargar los originales:

| Archivo                    | SHA-256                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| tmdb.svg                   | `8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c` |
| google-books-poweredby.png | `edf04c8a8d59da479bb8be1eed30057f7f7679b18249a2b54f69013817a2bc84` |

No se utilizaron credenciales para obtener estos recursos públicos y no se
realizaron consultas a las APIs de catálogo ni al LLM. Este commit no modifica
dependencias, contratos, configuración, CI ni lógica de negocio.
