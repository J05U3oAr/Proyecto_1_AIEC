# AGIChat: reglas para personas y agentes de IA

## 1. Propósito, alcance y fuentes

AGIChat ofrece el widget embebible de Sofía. La segunda entrega conecta ese SDK a un agente real que recomienda películas con TMDB, compara adaptaciones con libros y abre referencias de Google Books e IMDb. Las herramientas de consulta deben ser reutilizables mediante MCP.

Leer antes de trabajar, en este orden:

1. `INSTRUCTIONS.md`: requisitos académicos originales. No modificarlo para acomodar una implementación.
2. Este `AGENTS.md`: reglas transversales de ingeniería y colaboración.
3. `docs/delivery/plan.md`: reparto, contratos propuestos, dependencias y trazabilidad.
4. El archivo `docs/delivery/miembro-N-*.md` correspondiente y `docs/delivery/todo.md`.
5. `docs/delivery/contexto-curso-rubrica.md` y `docs/delivery/reutilizacion-a2a.md`: rúbrica, contexto docente y reutilización propuesta.
6. `DESIGN.md` para cualquier cambio visible; `docs/architecture/ARQUITECTURA.md` como descripción de la primera entrega hasta que se actualice.

Índice de navegación: [documentación](docs/README.md). Los README operativos permanecen junto a cada módulo.

Las carpetas y contratos nuevos descritos en el plan son propuestas de implementación, no capacidades ya existentes. Si las fuentes discrepan, documentar la diferencia y resolverla con el equipo; no eliminar requisitos ni inventar evidencias.

## 2. Reglas que no se deben romper

- **Ningún agente de IA puede hacer commits**, ni siquiera si una skill propone hacerlo. Se prohíben `git commit`, amend, commits mediante APIs, scripts, hooks u otras herramientas y cualquier equivalente indirecto. Los commits los ejecuta una persona después de revisar el diff.
- Los agentes tampoco ejecutan push, merge, publicación de releases, tags ni despliegues externos. Preparan archivos, pruebas y propuestas para que una persona los revise y ejecute. No crear PRs sin solicitud explícita.
- **No trabajar directamente en `main`.** Informar al usuario: «main está reservado para código estable probado en CI y debe estar protegido». La protección remota debe comprobarla un mantenedor; no afirmar que está activada sin evidencia.
- No usar `reset --hard`, `clean`, force push, rebase de ramas compartidas ni sobrescribir trabajo ajeno. Antes de editar, revisar rama y estado; conservar los cambios preexistentes.
- No rebajar cobertura, desactivar pruebas, ampliar exclusiones para ocultar código productivo ni silenciar errores con `any`, `@ts-ignore` o reglas deshabilitadas sin una justificación revisada.
- No incluir secretos en Git, cliente, prompts, fixtures, localStorage, logs o reportes. Las variables `VITE_*` son públicas: nunca usarlas para credenciales de TMDB, libros o LLM. Solo ejemplos sin valores reales en `.env.example`.
- No registrar tarjetas ni habilitar pagos. El registro de TMDB lo realiza una persona indicando estudiantes de CC3116 de la Universidad del Valle de Guatemala y uso no comercial. Cualquier otro proveedor debe funcionar sin tarjeta y con presupuesto explícito.
- No presentar MSW, respuestas hardcodeadas o pruebas con dobles como evidencia de que funciona el agente real. Mantener modos demo y real explícitos.
- No ejecutar texto, HTML, JavaScript, comandos ni URLs arbitrarias generados por el modelo. La aplicación valida y autoriza cada herramienta y acción.

## 3. GitHub Flow y revisión humana

1. Inspeccionar `git status --short --branch` y partir de un `main` actualizado, sin arrastrar cambios ajenos. Con cambios locales, conservarlos y acordar su pertenencia; no descartarlos automáticamente.
2. Crear ramas breves por tarea: `feat/<tema>`, `fix/<tema>`, `docs/<tema>`, `ci/<tema>` o `test/<tema>`. No crear ramas permanentes por miembro ni una rama `develop`.
3. Implementar una porción verificable, añadir pruebas y revisar el diff. El agente entrega resumen, comandos y resultados reales; no prepara staging de archivos ajenos.
4. Una persona revisa y crea commits atómicos con Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `ci:`), sube la rama y abre PR hacia `main`.
5. El PR describe problema, comportamiento final, pruebas, riesgos, requisitos cubiertos y cambios de contrato. Requiere CI verde y aprobación de al menos un compañero distinto del autor.
6. Una persona integra y elimina la rama después del merge. Configurar protección de `main` contra pushes directos y merges sin checks/revisión; el miembro 2 coordina su verificación con un mantenedor.

Cambios en contratos compartidos, dependencias, CI y configuración deben coordinarse con su responsable antes de editar. Un propietario facilita la integración; no exime al resto de probar sus cambios.

## 4. Arquitectura y contratos

- Conservar React 18, TypeScript estricto, Vite, Tailwind, Zustand y el SDK existente salvo decisión técnica documentada. No introducir otro framework sin necesidad demostrable.
- Mantener capas: UI → estado/servicio HTTP → backend/agente → cliente MCP → servidores MCP → proveedores. El navegador no llama directamente a proveedores con credenciales.
- Mantener `IChatService` como frontera del frontend; centralizar el envío asíncrono en un hook o servicio y evitar orquestación pesada dentro de componentes.
- Un agente central con herramientas es la propuesta inicial. MCP servers no son agentes. Introducir un MAS solo con una necesidad y un diagrama que justifiquen responsabilidades, comunicación y clasificación.
- El miembro 1 custodia `shared/contracts/` y el contrato HTTP/MCP con ejemplos, validación en runtime y errores tipados. Si el backend es Python, compartir schemas neutrales al lenguaje y generar/adaptar tipos sin definiciones divergentes. Primero aprobar contratos, después implementar en paralelo con fixtures compatibles.
- Preservar compatibilidad de `{ prompt }` → `{ response }`; los campos enriquecidos son opcionales. Cambios incompatibles requieren migración explícita y pruebas de consumidores.
- Backend replicable sin sesiones solo en memoria; aislar conversaciones por sesión/cliente, limitar tamaño del historial y definir expiración. Documentar cómo se comparten sesiones, caché y cuotas al replicar.
- Todas las llamadas externas tienen timeout, límites de tamaño, reintentos acotados solo cuando corresponda y manejo de `429`/cuota agotada. Limitar pasos y herramientas por turno. Nunca bucles o reintentos ilimitados.
- Aplicar presupuesto de curso de hasta 1,000 consultas diarias por proveedor, configurable y contabilizado también entre réplicas. No atribuir ese número a un límite contractual vigente del proveedor sin verificarlo.

## 5. Código, estado y UX/UI

- Tipos explícitos; `unknown` y validación para red/MCP. Usar `@/` dentro de `src`; definir alias propios para paquetes backend si se crean. No importar dependencias servidor en el bundle del SDK.
- Componentes funcionales, props tipadas y lógica de dominio fuera de la presentación. No duplicar contratos en cada módulo.
- Zustand conserva mensajes, sesión y estado de envío/error. `useState` queda para borrador, foco y detalles efímeros de la UI. Al extender persistencia, versionar/migrar y probar historiales anteriores.
- Seguir `DESIGN.md`, tokens semánticos y temas del SDK. Combinar clases dinámicas con `clsx`/`twMerge`. No usar colores aislados ni estilos inline salvo medidas calculadas y variables CSS derivadas de la configuración de tema existente.
- Accesibilidad por teclado, nombres accesibles, foco visible, feedback de carga/error y responsive son requisitos de aceptación.
- Markdown sin HTML crudo. Pósteres y enlaces solo de fuentes permitidas, con fallback y validación de URL en servidor y cliente.
- Atribución TMDB visible en la aplicación y en Créditos, con logo oficial sin alterar y aviso requerido; no insinuar patrocinio. Consultar su manual antes de entregar.

## 6. Seguridad del agente y MCP

Referencia de trabajo: **OWASP Top 10 for LLM Applications 2025**, LLM01 Prompt Injection y LLM07 System Prompt Leakage. Si el docente exige otra edición, acordar y registrar el cambio antes de cambiar los casos de evaluación.

- Usuario, historial, sinopsis, descripciones de libros y resultados MCP son datos no confiables; no pueden sustituir instrucciones del sistema ni autorizar acciones.
- No poner secretos ni controles de autorización en el system prompt. Separar instrucciones y datos, validar entradas/salidas y aplicar permisos en código.
- MCP expone herramientas específicas con schemas, resultados normalizados y errores explícitos. Prohibidas herramientas genéricas de shell, fetch arbitrario o navegación irrestricta.
- Validar HTTPS, hostname exacto, rutas e identificadores; rechazar hosts semejantes, credenciales embebidas, esquemas peligrosos y redirecciones fuera de la allowlist. Aplicar defensa SSRF al HTTP del servidor.
- El modelo propone una acción tipada; el navegador la ejecuta únicamente con intención explícita del usuario, validación y deduplicación. Ni restaurar historial ni renderizar Markdown puede abrir pestañas.
- Aislar sesiones; CORS con orígenes configurados, límites de tráfico/entrada y autenticación del transporte MCP cuando sea accesible por red. No confiar en IDs enviados por el cliente como autorización.
- Logs con ID de solicitud, latencia, herramientas, errores y consumo, sin prompts completos ni datos personales por defecto. No devolver stack traces o configuración interna al usuario.

## 7. Pruebas, evaluaciones y evidencia

Cada componente, hook, servicio, store o herramienta nuevo/modificado debe acompañarse de pruebas propias: camino feliz, estados alternos y errores relevantes. Las pruebas de UI cubren interacción y teclado; las de herramientas cubren schema, límites y fallos del proveedor.

**Umbral mínimo: 80% en líneas, funciones, ramas y sentencias.** Actualmente Vitest incluye `src/**`; ampliar controles para todo código productivo nuevo en backend/MCP/shared sin ocultarlo ni compensar un módulo sin pruebas con otro de alta cobertura.

Antes de revisión de código:

```bash
npm run lint
npm run format:check
npm run test:coverage
npm run build
npm run build:sdk
```

Si cambia el flujo conversacional, ejecutar también `npm run test:e2e`. Hoy este script usa Vitest/JSDOM: **no demuestra apertura real de pestañas**. Añadir pruebas en navegador real para esa capacidad. El miembro 2 añadirá/documentará scripts de backend/MCP y el miembro 3 el de evals; no afirmar que existen antes de implementarlos.

Las evals son distintas de los tests unitarios: versionar dataset, resultados esperados, herramientas permitidas/prohibidas, modelo/configuración, repeticiones, costos y reporte. Cubrir funcionalidad, LLM01 directo/indirecto y LLM07; comprobar efectos de herramientas, no solo palabras de rechazo. Los secretos de prueba son canarios sintéticos. Reportar fallos y limitaciones, sin prometer protección absoluta.

Para cambios solo de documentación, verificar formato, enlaces relativos, trazabilidad y consistencia; no es necesario ejecutar APIs, LLM ni toda la suite. Indicar exactamente qué se verificó.

## 8. Responsabilidad y definición de terminado

| Miembro | Responsable propuesto | Área principal                        | Instrucciones                                |
| ------- | --------------------- | ------------------------------------- | -------------------------------------------- |
| 1       | Diego Calderón        | Backend, agente, contratos y defensas | `docs/delivery/miembro-1-backend-agente.md`  |
| 2       | Hugo Méndez           | MCP películas, infraestructura y CI   | `docs/delivery/miembro-2-peliculas-infra.md` |
| 3       | Pedro Caso            | MCP libros, comparación y evals       | `docs/delivery/miembro-3-libros-evals.md`    |
| 4       | Arodi Chávez          | Widget, SDK, navegación y UX/UI       | `docs/delivery/miembro-4-widget-ux.md`       |

Asignación acordada: Diego asume la parte 1, Hugo la parte 2 y Pedro la parte 3; no presupone experiencia particular. Cada miembro implementa y prueba su área, documenta su operación y participa en la integración y revisión cruzada.

Una parte termina cuando cumple su archivo individual, sus pruebas y cobertura, el contrato compartido y el flujo real integrado; entrega evidencia reproducible y revisión humana. El cierre global requiere todos los requisitos de `INSTRUCTIONS.md`, ambos diagramas (alto y bajo nivel) coherentes con la implementación, explicación verificable de escalabilidad, evals, preparación de defensa de todos los miembros y repositorio ejecutable desde un clon limpio. Marcar tareas solo con evidencia real.
