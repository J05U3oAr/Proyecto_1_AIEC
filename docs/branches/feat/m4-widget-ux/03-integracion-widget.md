# Commit 3: integración en widget/SDK y evidencia

Rama: `feat/m4-widget-ux`. Responsable: Arodi Chávez (miembro 4).

Mensaje: `feat(m4): integrate credits into widget and document delivery`.

## Objetivo

Hacer visible la primera etapa desde el chat existente y documentar el alcance,
las verificaciones y los pendientes antes de continuar con la integración
conversacional y las fichas de películas/libros.

## Cambios de integración

Archivo: `src/components/widget/ChatWidget.tsx`.

- Importa `ProviderCredits` y lo renderiza después del input, dentro del panel
  que se muestra al abrir el chat. El acceso no depende de tener mensajes.
- Marca el contenedor del input como `shrink-0` para conservar su espacio cuando
  el usuario consulta los créditos.
- Limita el ancho compacto mediante `max-w-[calc(100vw-48px)]`, conservando el
  margen lateral de las posiciones existentes.
- Utiliza `100dvh` para el máximo de altura compacta disponible. El panel
  expandido conserva su configuración actual.

`AGIChatWidget` ya delega en `ChatWidget`, por lo que la misma atribución queda
incluida en el SDK sin cambiar sus props públicas ni duplicar el componente.
Los recursos importados se empaquetan en los formatos ES y UMD.

Se incorpora además la [evidencia detallada de la etapa](../../../delivery/implementacion-m4-etapa-1.md)
y el [índice de la rama](README.md).

## Validación registrada

- Suite local de cobertura: 73 tests en 18 archivos, aprobados. Sentencias
  96.14%, ramas 94.26%, funciones 95.55% y líneas 96.32%.
- Pruebas dirigidas de Créditos, ChatWidget y SDK: 14 aprobadas, incluidas
  posiciones y temas existentes.
- Lint y builds de aplicación/SDK: aprobados. Vite advierte sobre tamaño del bundle.
- Ambos formatos del SDK contienen los gráficos como data URI, sin depender de
  un `/public` alojado por el consumidor.
- No se encontraron los valores de las credenciales del `.env` en los builds
  al realizar la comprobación local. No se imprimieron credenciales.
- Formato de los archivos de esta etapa y `git diff --check`: correctos.
  El control global de formato detecta 74 archivos preexistentes ajenos a esta
  porción. No se reformateó todo el repositorio.

No se acreditan capturas, apertura de pestañas por conversación, conexión real ni
CI remoto. La revisión de navegador sigue pendiente porque su host no estuvo
disponible. Las pruebas de esta etapa consumieron cero consultas de proveedores.

## Organización y autorización

El trabajo comenzó en `feat/m4-attribution`; a solicitud posterior de Arodi se
creó `feat/m4-widget-ux` para agrupar su parte. El usuario solicitó expresamente
crear al menos tres commits y subir la rama. La revisión automática rechazó el
primer `git commit` citando la prohibición de `AGENTS.md`, aun con esa solicitud.
El usuario respondió después «Sí, autorizo esa excepción limitada» a la pregunta
que especificaba estos tres commits y el push de `feat/m4-widget-ux` a `origin`.
Con esa autorización explícita, la revisión permitió continuar. Los primeros
commits son `543d751` y `6f08771`; este documento acompaña al tercero. La política
general del repositorio no se modifica y el resultado remoto se comprueba tras
crear el tercer commit y ejecutar el push.

El `.env` permanece local e ignorado. El push publica el código de esta rama;
no integra `main`, no crea un PR y no representa un despliegue en GitHub Pages.
El workflow actual se activa para push a `main` o PR hacia `main`, por lo que no
se debe interpretar el push de esta rama como evidencia de CI ejecutado.
