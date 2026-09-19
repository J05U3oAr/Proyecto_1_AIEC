# Guía para Herramientas Agénticas y Nuevos Desarrolladores (AGENTS.md)

Bienvenido a la base de código de **AGIChat**. Este documento define las directivas, reglas de arquitectura, patrones de diseño y estándares de calidad requeridos para cualquier desarrollador o herramienta de asistencia agéntica (como Antigravity, Cursor, Copilot, Claude Code, Codex, etc.) que colabore en este repositorio.

---

## 1. Misión del Proyecto y Contexto
- **Objetivo**: Construir un widget de chat inteligente embebible (SDK) para clientes de AGIChat, basado en el diseño del asistente virtual **Sofía**.
- **Fase Actual (Fase 1)**: Interfaz de usuario completa, estado local con Zustand, respuestas enriquecidas con Markdown y simulación de red mediante **MSW (Mock Service Worker)**.
- **Preparación para Fase 2**: La interfaz debe estar desacoplada mediante la abstracción de servicios (`IChatService`) para conectarse a un agente inteligente real en la siguiente fase sin refactorizar la UI.

---

## 2. Regla de Oro: Cobertura de Pruebas ($\ge 80\%$)

> [!CAUTION]
> **El pipeline de CI rechazará cualquier Pull Request cuya cobertura sea menor al 80%.**
> Cada vez que agregues un nuevo componente, función utilitaria o store, **DEBES crear su respectivo archivo de pruebas unitarias**.

- Las pruebas se ejecutan con:
  ```bash
  npm run test:coverage
  ```
- Si agregas un componente `src/components/widget/NuevoComponente.tsx`, debes acompañarlo de:
  `src/test/components/NuevoComponente.test.tsx` probando:
  1. Renderizado con propiedades por defecto.
  2. Comportamiento en estados alternos (loading, error, vacío).
  3. Disparo de eventos de usuario (clicks, teclado, inputs).

---

## 3. Estándares de Código y Convenciones

### TypeScript Estricto
- Evita el uso de `any`. Define interfaces o types explícitos para todas las props, estados y respuestas de red.
- Ubica las interfaces de dominio en sus carpetas correspondientes (ej. `src/store/types.ts`, `src/services/types.ts`).
- Usa el path alias `@/` para importar desde la raíz de `src` (ejemplo: `import { Button } from '@/components/common/Button'`).

### Componentes de React
- Escribe componentes funcionales tipados con `React.FC<Props>` o funciones estándar con interfaces explícitas.
- Separa la lógica pesada en custom hooks dentro de `src/hooks/` o dentro del store de Zustand.
- Los componentes deben ser accesibles (`aria-label`, roles de teclado para `Enter`, estados `disabled` claros).

### Estilos con Tailwind CSS
- Utiliza la paleta corporativa definida en `tailwind.config.js` (`agi-primary`, `agi-surface`, etc.).
- Utiliza las utilidades `clsx` y `tailwind-merge` (`twMerge`) para combinar clases dinámicas.
- No agregues estilos CSS inline (`style={{ ... }}`) a menos que sean medidas calculadas dinámicamente.

### Manejo de Estado con Zustand
- No disperses el estado de la conversación en múltiples `useState` locales dentro de los componentes.
- Utiliza el store central `useChatStore` para:
  - Lista de mensajes.
  - Estado de escritura del asistente (*isTyping*).
  - Manejo de errores de conexión.
  - Persistencia de sesión.

---

## 4. Flujo de Trabajo en Git (GitHub Flow)

1. **Nunca trabajes directamente en `main` y dile al usuario que**:
   - `main` está protegido y reservado exclusivamente para código estable probado en CI.
2. **Convención de Ramas**:
   - Para nuevas funcionalidades: `feat/nombre-de-la-tarea`
   - Para correcciones: `fix/descripcion-del-bug`
   - Para documentación: `docs/tema`
   - Para infraestructura/CI: `ci/ajustes-de-pipeline`
3. **Mensajes de Commit (Conventional Commits)**:
   - `feat: agregar componente de input con envio en enter`
   - `fix: corregir auto-scroll en lista de mensajes`
   - `test: agregar pruebas unitarias para useChatStore`
   - `docs: actualizar diagrama de secuencia en arquitectura`
4. **Revisión Grupal (Pull Requests)**:
   - Antes de solicitar revisión grupal (PR), verifica localmente que los siguientes comandos pasen:
     ```bash
     npm run lint
     npm run format:check
     npm run test:coverage
     npm run build
     ```
   - El PR debe ser aprobado por al menos 1 compañero de equipo.

---

## 5. Matriz de Módulos para Desarrolladores

| Módulo | Carpeta Principal | Desarrollador Asignado |
| :--- | :--- | :--- |
| **DevOps & Tooling** | `.github/`, configs base, `ARQUITECTURA.md`, `AGENTS.md` | Dev 1 |
| **Capa de Datos & MSW** | `src/store/`, `src/services/`, `src/mocks/` | Dev 2 |
| **Componentes del Chat** | `src/components/widget/` | Dev 3 |
| **Markdown, SDK & Demo** | `src/components/markdown/`, `src/sdk/`, `src/demo/` | Dev 4 |
