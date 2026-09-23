# AGIChat SDK & Widget (Proyecto #1 - IA)

Bienvenido al repositorio oficial del **Chat Widget SDK** desarrollado para **AGIChat**. Este proyecto proporciona un widget agéntico modular, accesible y preparado para ser integrado en aplicaciones de clientes o portales web.

## Participantes:

- Pedro Caso - 241286
- Diego Calderón - 241263
- Hugo Méndez - 241265
- Arodi Chávez - 241211

---

## Pila Tecnológica

- **Frontend**: React 18, TypeScript, Vite
- **Estilos & UI**: Tailwind CSS, Radix UI, Framer Motion, Lucide Icons
- **Gestión de Estado**: Zustand con persistencia
- **Simulación de Red**: Mock Service Worker (MSW)
- **Renderizado de Respuestas**: React Markdown + GitHub Flavored Markdown (`remark-gfm`)
- **Testing & Cobertura**: Vitest, React Testing Library, JSDOM, `@vitest/coverage-v8` (Umbral $\ge 80\%$)
- **Calidad de Código**: ESLint Flat Config, Prettier
- **Integración Continua**: GitHub Actions (`.github/workflows/ci.yml`)

---

## Instalación y Configuración Local

1. Clona el repositorio y cambia a tu rama de trabajo:

   ```bash
   git clone git@github.com:J05U3oAr/Proyecto_1_AIEC.git
   cd Proyecto_1_AIEC
   ```

2. Instala las dependencias del proyecto:

   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo local:
   ```bash
   npm run dev
   ```

---

## Scripts Disponibles

| Script                  | Descripción                                                                |
| :---------------------- | :------------------------------------------------------------------------- |
| `npm run dev`           | Inicia el servidor de desarrollo local con Vite (puerto 3000)              |
| `npm run build`         | Compila TypeScript y genera el bundle de producción en `dist/`             |
| `npm run build:sdk`     | Genera el paquete reutilizable, estilos y tipos en `dist-sdk/`             |
| `npm run preview`       | Previsualiza el bundle compilado localmente                                |
| `npm run test`          | Ejecuta las pruebas unitarias una sola vez                                 |
| `npm run test:e2e`      | Ejecuta el flujo E2E del widget con MSW                                    |
| `npm run test:watch`    | Ejecuta las pruebas en modo interactivo con recarga en caliente            |
| `npm run test:coverage` | Ejecuta las pruebas con reporte de cobertura (**falla si es menor a 80%**) |
| `npm run lint`          | Valida errores de código y estilo con ESLint                               |
| `npm run lint:fix`      | Corrige automáticamente errores de estilo con ESLint                       |
| `npm run format`        | Aplica el formateo de código con Prettier                                  |
| `npm run format:check`  | Verifica que el código cumpla con el formato de Prettier                   |

---

## Documentación del Proyecto

- **[ARQUITECTURA.md](./ARQUITECTURA.md)**: Diagrama de arquitectura de alto nivel en Mermaid.js, justificación técnica del diseño por capas y guía detallada de carpetas para el equipo.
- **[AGENTS.md](./AGENTS.md)**: Directivas y lineamientos de codificación para desarrolladores y herramientas agénticas (cobertura $\ge 80\%$, estándares de TypeScript y checklist para Pull Requests).

---

## Flujo de Trabajo (GitHub Flow)

1. Crea tu rama a partir de `main`: `git checkout -b feat/mi-funcionalidad`.
2. Realiza tus cambios y añade pruebas unitarias asegurando `npm run test:coverage >= 80%`.
3. Verifica calidad: `npm run lint && npm run format:check && npm run test:coverage && npm run build`.
4. Sube tu rama y abre un **Pull Request** para revisión grupal.

---

## Uso como SDK

Genera los archivos distribuibles con:

```bash
npm run build:sdk
```

Después de instalar o enlazar el paquete, importa el componente y sus estilos:

```tsx
import { AGIChatWidget } from 'agichat-widget-sdk';
import 'agichat-widget-sdk/styles.css';

export function App() {
  return (
    <AGIChatWidget
      agentName="Luna"
      welcomeMessage="¿En qué puedo ayudarte?"
      position="bottom-right"
      theme="dark"
    />
  );
}
```

El widget acepta las propiedades `agentName`, `welcomeMessage`, `avatarUrl`, `position` y
`theme`. La posición puede ubicarse en cualquiera de las cuatro esquinas. El tema puede ser
`light`, `dark` o un objeto parcial de colores personalizados.
