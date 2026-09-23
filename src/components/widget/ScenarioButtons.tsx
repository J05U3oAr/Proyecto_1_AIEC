import { Code2, Table2, WifiOff } from 'lucide-react';
import { useState } from 'react';

import { setMockScenario, type MockScenario } from '@/mocks/demoScenario';
import { chatService } from '@/services/chatService';
import { useChatStore } from '@/store/useChatStore';

type DemoScenario = Exclude<MockScenario, 'default'>;

interface ScenarioDefinition {
  scenario: DemoScenario;
  label: string;
  description: string;
  prompt: string;
  icon: typeof Table2;
}

const scenarios: ScenarioDefinition[] = [
  {
    scenario: 'table',
    label: 'Probar tabla',
    description: 'Métricas estructuradas con Markdown GFM.',
    prompt: 'Muéstrame las métricas del piloto',
    icon: Table2,
  },
  {
    scenario: 'code',
    label: 'Probar código',
    description: 'Bloque TypeScript con resaltado y copiado.',
    prompt: 'Muéstrame un ejemplo de integración',
    icon: Code2,
  },
  {
    scenario: 'error',
    label: 'Simular caída',
    description: 'Respuesta HTTP 503 desde MSW.',
    prompt: 'Comprueba la disponibilidad del agente',
    icon: WifiOff,
  },
];

export function ScenarioButtons() {
  const [activeScenario, setActiveScenario] = useState<DemoScenario | null>(null);
  const [completedScenario, setCompletedScenario] = useState<DemoScenario | null>(null);

  const runScenario = async (definition: ScenarioDefinition): Promise<void> => {
    const store = useChatStore.getState();
    setMockScenario(definition.scenario);
    setActiveScenario(definition.scenario);
    setCompletedScenario(null);

    if (!store.isOpen) {
      store.toggleChat();
    }

    const messageId = store.sendMessage(definition.prompt);
    store.setTyping(true);

    try {
      const response = await chatService.sendMessage(definition.prompt);
      useChatStore.getState().markMessageAsSent(messageId);
      useChatStore.getState().receiveMessage(response.response);
    } catch {
      useChatStore.getState().markMessageAsError(messageId);
    } finally {
      setCompletedScenario(definition.scenario);
      setActiveScenario(null);
    }
  };

  return (
    <section className="mt-8 w-full max-w-xl text-left" aria-labelledby="scenario-title">
      <div className="mb-3 flex items-center justify-between gap-4 text-xs uppercase tracking-[0.18em]">
        <h2 id="scenario-title">Escenarios de demostración</h2>
        <span aria-live="polite" className="text-green-300/70">
          {activeScenario ? '[RUNNING]' : completedScenario ? '[DONE]' : '[READY]'}
        </span>
      </div>

      <div className="grid gap-2">
        {scenarios.map(definition => {
          const Icon = definition.icon;
          const isActive = activeScenario === definition.scenario;

          return (
            <button
              key={definition.scenario}
              type="button"
              onClick={() => void runScenario(definition)}
              disabled={activeScenario !== null}
              className="group flex items-center gap-3 rounded border border-green-500/50 bg-black/60 p-3 text-left transition hover:bg-green-500/10 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-green-500/50 text-green-300 transition group-hover:bg-green-500 group-hover:text-black">
                <Icon size={17} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-green-300">
                  {isActive ? `> ${definition.label}` : definition.label}
                </span>
                <span className="block text-xs text-green-500/70">{definition.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
