import { AGIChatTheme, AGIChatThemeColors } from './types';

const lightTheme: AGIChatThemeColors = {
  primary: '#000000',
  primaryContrast: '#ffffff',
  surface: '#ffffff',
  surfaceMuted: '#f1f5f9',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#d1d5db',
};

const darkTheme: AGIChatThemeColors = {
  primary: '#3b82f6',
  primaryContrast: '#ffffff',
  surface: '#0f172a',
  surfaceMuted: '#1e293b',
  text: '#f8fafc',
  textMuted: '#cbd5e1',
  border: '#475569',
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
