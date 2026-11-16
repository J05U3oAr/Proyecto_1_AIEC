Diseñar e implementar un sistema de inteligencia artificial o MAS (multi agent system) escalable utilizando herramientas de codeo agéntico, creando una base de código mantenible, de alta calidad, robusta y confiable

Instrucciones
Resuelvan el siguiente problema utilizando los conceptos vistos en clase. Continuando el desarrollo realizado en el proyecto #1. Bajo las mismas reglas de acuerdo a:

Test coverage
Github Flow como estrategia de branching
La entrega deberá cumplir con lo siguiente:

Link al repositorio con el código funcionando e implementando los requisitos funcionales.
Evals probando el uso correcto del agente y como se comporta contra al menos 2 tipos de ataque (LLM01 y LLM07) del OWASP Top 10 for LLM .
Diagrama de arquitectura de alto nivel de los componentes del proyecto, deben ser capaces de justificar porqué su solución escala.
Diagrama de arquitectura de bajo nivel de la organización de sus agentes (si es que utiliza más de un agente) en conjunto con su clasificación (si es jerárquico, centralizado, decentralizado o una combinación de varios) 

Maxine se encuentra satisfecha con los resultados presentados por su grupo. Por lo que ahora les ha solicitado ya implementar un producto entero con una infraestructura escalable para ella poder salir a vender personalmente el producto (ya que despidió a su departamento de ventas).

Para esto debe implementar un sistema de inteligencia artificial que tenga las siguientes habilidades:

Se pueda comunicar a través de la widget que desarrollaron en el proyecto #1
Sea capaz de recomendar películas utilizando la API de The Movie Database https://www.themoviedb.org 
Dado a que utilizarán free tiers deben de colocar el logo de The Movie Database (o atribución) tal y como dice en su manual de uso de API, para que Maxine no tenga ningún problema legal.
Al crear la API key porfavor especificar que son estudiantes del curso CC3116 de la Universidad del Valle de Guatemala y seleccionar uso no comercial.
Esta API les da un cap de 1000 requests diarias sin costo alguno.
Sea capaz de comparar peliculas con libros (si es que la película tiene libro) y decidir si la película vale la pena verla o no.
Puede utilizar cualquier API de libros pero se le recomienda utilizar Google Books API, ya que es gratuita y no requiere de tarjeta de crédito, también tiene un free tier de 1000 requests diarias. 
No colocar ningún tipo de tarjeta de crédito, para evitar consecuencias graves.
El agente le debe de anunciar al usuario que es capaz de hacer esto si lo desea.
Sea capaz de abrir en una pestaña de navegador, sin que el usuario le de click a un link, a estos sitios de referencia:
Google Books
IMBD
El agente tiene que ser capaz de mostrar una imágen del poster de la película que le recomiende al usuario.
El agente tiene que estar reforzado contra al menos 2 ataques (LLM01 y LLM07) del OWASP Top 10 for LLMs
Dado a que es posible que más adelante otros agentes usen las herramientas que desarrollen de sus agentes, deben de abstraerlas en uno o varios MCP Servers.