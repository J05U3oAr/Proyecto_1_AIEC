# M4, etapa 1: créditos y preparación local

Fecha: 17/11/2026. Rama: `feat/m4-widget-ux`. Responsable: Arodi Chávez.

La rama inicial `feat/m4-attribution` se sustituyó como rama de trabajo por
`feat/m4-widget-ux` a solicitud del usuario. El [registro de commits](../branches/feat/m4-widget-ux/README.md)
detalla las tres porciones de esta etapa. Tras un bloqueo inicial de la revisión
automática, el usuario autorizó una excepción explícita para estos tres commits
y el push de esta rama a `origin`.

Primera porción para revisión del usuario: componente `ProviderCredits`, integrado
en el widget y por tanto también en el SDK. No cierra M4.1–M4.4 ni los checks
globales de [seguimiento](todo.md).

## Cambios

- Acceso estable «Créditos y fuentes» mediante un disclosure HTML nativo, con
  indicador de foco y altura mínima de 44 px. No borra ni sustituye el historial.
- Logo oficial TMDB enlazado al sitio oficial dentro de Créditos; aviso requerido
  en inglés siempre visible en el pie del chat abierto.
- Apartado Google Books con gráfico oficial sin modificar y enlace al servicio.
  Se presenta sobre una placa blanca fija, independiente del tema, para conservar
  legibilidad del gráfico transparente sin recolorear la marca.
- Distinción entre datos de proveedores y opiniones generadas por Sofía.
- Ancho compacto limitado al viewport y altura disponible con `dvh`. Falta revisión
  visual en los tamaños y temas exigidos por M4; este cambio no acredita esa revisión.
- Gráficos importados desde `src/assets/attribution/`: Vite los empaqueta también
  en la librería, sin rutas absolutas a `/public` que fallen en un SDK o en Pages.

El archivo de entorno proporcionado se copió a `.env`, ignorado por Git. Solo se
inspeccionaron nombres de variables; sus valores no forman parte de esta evidencia.
El servidor Vite de revisión se inició con `VITE_CHAT_MODE=mock` mediante variable
de proceso, sin cambiar las preferencias del archivo del usuario.

## Reglas verificadas y límites

Fuentes oficiales consultadas el 17/11/2026:

- [TMDB FAQ](https://developer.themoviedb.org/docs/faq): logo aprobado, aviso
  requerido, créditos dentro de la aplicación y ausencia de respaldo. El uso
  gratuito indicado allí es no comercial; esta entrega académica no acredita
  una licencia para comercializar el producto.
- [TMDB logos](https://www.themoviedb.org/about/logos-attribution): recurso
  descargado directamente del sitio oficial; se conservan bytes, colores y proporción.
- [Google Books branding](https://developers.google.com/books/branding): atribución
  junto a resultados y enlace destacado de cada libro, además de preservar marcas.

**Pendiente obligatorio:** los créditos de Google Books no sustituyen el gráfico
junto a resultados. La siguiente etapa de fichas/comparaciones debe mostrar
«Powered by Google» junto a los datos de libros y un enlace validado a cada volumen.
No se ha añadido aún el renderizado de los campos enriquecidos del backend ni
se ha auditado la atribución de respuestas antiguas de texto libre. Si se incorpora
una vista previa, revisar también el botón oficial «Google Preview» exigido para
esa función. No reconstruir logos con texto, no recolorearlos mediante filtros
y no interpretar la atribución como licencia general de las imágenes.

## Procedencia de los archivos

Se descargaron estos archivos estáticos una vez; no son llamadas a APIs de catálogo:

- `tmdb.svg`: [original oficial](https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg).
  SHA-256: `8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c`.
- `google-books-poweredby.png`: [original oficial](https://books.google.com/googlebooks/images/poweredby.png),
  enlazado por la guía de branding. SHA-256:
  `edf04c8a8d59da479bb8be1eed30057f7f7679b18249a2b54f69013817a2bc84`.

Su uso se rige por las condiciones de marca de cada proveedor, no por una licencia
genérica del código del proyecto.

## Verificación

- `npm run test:coverage`: 73 tests, 18 archivos, aprobados. Sentencias 96.14%,
  ramas 94.26%, funciones 95.55%, líneas 96.32%. El reporte incluye el componente nuevo.
- Prueba dirigida a Créditos, ChatWidget y SDK: 14 tests aprobados. Cubre aviso
  visible, apertura/cierre, foco alcanzable, enlaces externos seguros y conservación
  del historial sin peticiones fetch al abrir Créditos. JSDOM no demuestra interacción
  nativa de Enter sobre `summary` ni revisión visual real.
- `npm run lint` y `npm run build`: aprobados. Vite avisa sobre tamaño del bundle.
- `npm run build:sdk`: aprobado. Ambos formatos incluyen gráficos como data URI.
  Comprobación local: no se encontraron los valores de credenciales del `.env`
  en los builds de aplicación/SDK; no se imprimieron valores en la comprobación.
- `npm run format:check`: señala 74 archivos preexistentes sin cambios en esta rama.
  Los archivos de esta etapa se formatearon y comprueban por separado.
- La herramienta de navegador no pudo conectarse a su host. Sin capturas ni
  evidencia de layout/teclado en navegador real en esta etapa.
- Consumo de APIs TMDB, Google Books y LLM durante esta etapa: **cero**. Las consultas
  realizadas fueron a documentación y gráficos públicos, y las pruebas usan dobles.

## Revisión manual propuesta

1. Iniciar Vite en modo mock. En PowerShell:
   `$env:VITE_CHAT_MODE='mock'; npm.cmd run dev -- --host 127.0.0.1 --open false`.
2. Abrir `http://127.0.0.1:3000/`, abrir chat y comprobar aviso TMDB visible.
3. Desplegar «Créditos y fuentes», verificar ambos gráficos y legibilidad.
4. Recorrer con Tab, desplegar con Enter/Espacio y volver a la conversación.
5. Repetir con viewport de 320/375/768/1440 px y temas claro/oscuro/personalizado.

La instrucción general de `AGENTS.md` reserva commits, push y despliegue a una
persona. Posteriormente el usuario solicitó expresamente al agente crear al
menos tres commits y subir esta rama; la revisión automática rechazó el primer
commit por esa regla. El usuario confirmó después la excepción limitada y se
permitió continuar con los commits. El push se verifica después del tercero.
No se solicita ni ejecuta despliegue Pages, merge o PR. No se
modificaron contratos, dependencias ni CI. El `.env` continúa fuera de Git.
