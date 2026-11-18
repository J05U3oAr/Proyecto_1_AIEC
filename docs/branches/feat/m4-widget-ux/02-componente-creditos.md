# Commit 2: componente de créditos y pruebas

Rama: `feat/m4-widget-ux`. Responsable: Arodi Chávez (miembro 4).

Mensaje: `feat(m4): add accessible provider credits with tests`.

## Objetivo

Encapsular la atribución en `ProviderCredits` para utilizarla desde el widget y
el SDK. Depende de los gráficos originales incorporados en el primer commit.
Esta porción incluye sus propias pruebas; la integración visual se hace en el
tercer commit.

## Implementación

Archivo: `src/components/widget/ProviderCredits.tsx`.

- Pie de créditos identificado mediante `aria-label`, con colores de texto y
  superficies heredados de las variables del widget.
- Disclosure nativo `details`/`summary` llamado «Créditos y fuentes». El resumen
  tiene un objetivo de al menos 44 px de alto y foco visible.
- Contenido desplegable con altura máxima de `30dvh` y scroll vertical para
  limitar cuánto espacio puede ocupar dentro del panel.
- Apartados separados para TMDB y Google Books, con gráficos oficiales importados
  como recursos del bundle. El logo de TMDB conserva su proporción; el de Google
  se presenta sobre una placa blanca para ser legible en temas oscuros.
- Enlaces a los sitios oficiales, nombres accesibles que anuncian la nueva
  pestaña y `rel="noopener noreferrer"`.
- Aviso de TMDB fuera del contenido plegable, de modo que permanece visible
  aunque los detalles estén cerrados.
- Texto que distingue datos bibliográficos/catálogo de las recomendaciones y
  veredictos generados por Sofía.

No hay efectos de red, lógica de navegación automática, persistencia ni cambios
en el historial. Consultar Créditos no genera una consulta al agente.

## Pruebas

Archivo: `src/test/components/ProviderCredits.test.tsx`.

1. El aviso exacto de TMDB permanece visible con los detalles cerrados.
2. El control recibe foco mediante Tab, permite abrir/cerrar el contenido, no
   invoca `fetch` y conserva la referencia del historial del store.
3. Los enlaces usan los destinos oficiales y atributos seguros; los dos gráficos
   tienen nombres accesibles y no reciben estilos/filtros que modifiquen su color.

Las tres pruebas pasan. La ejecución dirigida junto con los tests existentes de
ChatWidget y SDK suma 14 pruebas aprobadas. JSDOM no demuestra la interacción
nativa de Enter/Espacio sobre `summary`, el contraste renderizado ni el layout
real. La herramienta de navegador estuvo inaccesible en esta etapa.

## Límites y siguiente paso

Este componente cubre Créditos, pero no sustituye «Powered by Google» junto a
resultados de libros ni el enlace de cada volumen. Esa obligación debe integrarse
al implementar fichas/comparaciones. No se declara completada M4.4 ni se acredita
funcionamiento con proveedores reales mediante estas pruebas.
