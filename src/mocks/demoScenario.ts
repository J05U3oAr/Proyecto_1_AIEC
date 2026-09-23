export type MockScenario = 'default' | 'table' | 'code' | 'error';

let activeMockScenario: MockScenario = 'default';

export function getMockScenario(): MockScenario {
  return activeMockScenario;
}

export function setMockScenario(scenario: MockScenario): void {
  activeMockScenario = scenario;
}

export function resetMockScenario(): void {
  activeMockScenario = 'default';
}
