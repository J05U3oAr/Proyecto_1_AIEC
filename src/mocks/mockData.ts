export const GALACTIC_GUIDE_RESPONSE =
  'Según *La guía del autoestopista galáctico*, la respuesta a la vida, el universo y todo lo demás es **42**.';

export const getMockResponse = (prompt: string): string => {
  const normalizedPrompt = prompt.toLocaleLowerCase();

  if (
    normalizedPrompt.includes('vida') &&
    normalizedPrompt.includes('universo') &&
    normalizedPrompt.includes('todo')
  ) {
    return GALACTIC_GUIDE_RESPONSE;
  }

  return `¡Hola! Soy Sofía. Recibí tu mensaje: **${prompt}**. ¿En qué más puedo ayudarte?`;
};
