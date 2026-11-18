import { AGIChatTheme, AGIChatThemeColors } from './types';

const lightTheme: AGIChatThemeColors = {
  primary: '#2563eb',
  primaryContrast: '#ffffff',
  surface: '#ffffff',
  surfaceMuted: '#f1f5f9',
  text: '#0f172a',
  textMuted: '#475569',
  border: '#64748b',
};

const darkTheme: AGIChatThemeColors = {
  primary: '#60a5fa',
  primaryContrast: '#0f172a',
  surface: '#0f172a',
  surfaceMuted: '#1e293b',
  text: '#f8fafc',
  textMuted: '#cbd5e1',
  border: '#64748b',
};

export interface ResolvedWidgetTheme {
  name: 'light' | 'dark' | 'custom';
  colors: AGIChatThemeColors;
}

export function resolveWidgetTheme(theme: AGIChatTheme): ResolvedWidgetTheme {
  if (theme === 'dark') {
    return { name: 'dark', colors: darkTheme };
  }

  if (theme === 'light') {
    return { name: 'light', colors: lightTheme };
  }

  return {
    name: 'custom',
    colors: { ...lightTheme, ...theme },
  };
}
