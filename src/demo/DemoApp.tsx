import { Code2, LayoutPanelTop, Table2, WifiOff } from 'lucide-react';
import { useState } from 'react';

import { getMockScenario, setMockScenario, type MockScenario } from '@/mocks/demoScenario';
import { chatService } from '@/services/chatService';
import { AGIChatTheme, AGIChatWidget, WidgetPosition } from '@/sdk';
import { useChatStore } from '@/store/useChatStore';

type ThemeOption = 'light' | 'dark' | 'violet';

const themeOptions: Record<ThemeOption, AGIChatTheme> = {
  light: 'light',
  dark: 'dark',
  violet: {
    primary: '#7c3aed',
    surface: '#faf5ff',
    surfaceMuted: '#ede9fe',
    text: '#2e1065',
    textMuted: '#6b21a8',
    border: '#c4b5fd',
  },
};

const scenarioPrompts: Record<MockScenario, string> = {
  default: 'Hola Sofía',
  table: 'Muéstrame las métricas del piloto',
  code: 'Muéstrame un ejemplo de integración',
  error: 'Comprueba la disponibilidad del agente',
};

interface DemoAction {
  scenario: Exclude<MockScenario, 'default'>;
  label: string;
  description: string;
  icon: typeof Table2;
}

const demoActions: DemoAction[] = [
  {
    scenario: 'table',
    label: 'Probar tabla',
    description: 'Métricas estructuradas con Markdown GFM.',
    icon: Table2,
  },
  {
    scenario: 'code',
    label: 'Probar código',
    description: 'Bloque TypeScript con resaltado y copiado.',
    icon: Code2,
  },
  {
    scenario: 'error',
    label: 'Simular caída',
    description: 'Respuesta HTTP 503 desde MSW.',
    icon: WifiOff,
  },
];

export function DemoApp() {
  const [agentName, setAgentName] = useState('Sofía');
  const [themeOption, setThemeOption] = useState<ThemeOption>('light');
  const [position, setPosition] = useState<WidgetPosition>('bottom-right');
  const [isSendingExample, setIsSendingExample] = useState(false);
  const [lastScenario, setLastScenario] = useState<MockScenario>(getMockScenario);

  const runScenario = async (scenario: Exclude<MockScenario, 'default'>): Promise<void> => {
    setMockScenario(scenario);
    setLastScenario(scenario);
    setIsSendingExample(true);

    const store = useChatStore.getState();
    if (!store.isOpen) {
      store.toggleChat();
    }

    const prompt = scenarioPrompts[scenario];
    const messageId = store.sendMessage(prompt);
    store.setTyping(true);

    try {
      const response = await chatService.sendMessage(prompt);
      useChatStore.getState().markMessageAsSent(messageId);
      useChatStore.getState().receiveMessage(response.response);
    } catch {
      useChatStore.getState().markMessageAsError(messageId);
    } finally {
      setIsSendingExample(false);
    }
  };

  const clearDemo = () => {
    useChatStore.getState().clearChat();
    setMockScenario('default');
    setLastScenario('default');
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100 sm:px-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 p-8 shadow-2xl shadow-violet-950/30 sm:p-12">
          <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
            <LayoutPanelTop size={14} aria-hidden="true" />
            Showcase interactivo
          </div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Una interfaz agéntica lista para cada cliente.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            Personaliza el widget de AGIChat y prueba respuestas enriquecidas sin salir de esta
            experiencia.
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-bold text-white">42</p>
              <p className="mt-1 text-sm text-slate-400">respuesta galáctica</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-bold text-white">GFM</p>
              <p className="mt-1 text-sm text-slate-400">Markdown enriquecido</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-bold text-white">MSW</p>
              <p className="mt-1 text-sm text-slate-400">API simulada</p>
            </div>
          </div>
        </section>

        <aside className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-violet-700">Panel de configuración</p>
              <h2 className="mt-1 text-2xl font-bold">Prueba el SDK en vivo</h2>
            </div>
            <span
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
              aria-live="polite"
            >
              API: {lastScenario === 'default' ? 'normal' : lastScenario}
            </span>
          </div>

          <div className="mt-7 space-y-5">
            <label className="block text-sm font-medium">
              Nombre del agente
              <input
                value={agentName}
                onChange={event => setAgentName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                aria-label="Nombre del agente"
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Tema
                <select
                  value={themeOption}
                  onChange={event => setThemeOption(event.target.value as ThemeOption)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                  aria-label="Tema del widget"
                >
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                  <option value="violet">Violeta</option>
                </select>
              </label>

              <label className="block text-sm font-medium">
                Posición
                <select
                  value={position}
                  onChange={event => setPosition(event.target.value as WidgetPosition)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                  aria-label="Posición del widget"
                >
                  <option value="bottom-right">Inferior derecha</option>
                  <option value="bottom-left">Inferior izquierda</option>
                  <option value="top-right">Superior derecha</option>
                  <option value="top-left">Superior izquierda</option>
                </select>
              </label>
            </div>

            <div>
              <p className="text-sm font-medium">Escenarios de demostración</p>
              <div className="mt-2 grid gap-2">
                {demoActions.map(({ scenario, label, description, icon: Icon }) => (
                  <button
                    key={scenario}
                    type="button"
                    onClick={() => void runScenario(scenario)}
                    disabled={isSendingExample}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-violet-300 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="rounded-lg bg-violet-100 p-2 text-violet-700">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs text-slate-500">{description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={clearDemo}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              Limpiar demostración
            </button>
          </div>
        </aside>
      </div>

      <AGIChatWidget
        agentName={agentName || 'Sofía'}
        welcomeMessage="Explora las respuestas de muestra o hazme una pregunta."
        position={position}
        theme={themeOptions[themeOption]}
      />
    </main>
  );
}
