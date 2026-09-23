export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface AGIChatThemeColors {
  primary: string;
  primaryContrast: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  border: string;
}

export type AGIChatTheme = 'light' | 'dark' | Partial<AGIChatThemeColors>;

export interface AGIChatWidgetProps {
  agentName?: string;
  welcomeMessage?: string;
  avatarUrl?: string;
  position?: WidgetPosition;
  theme?: AGIChatTheme;
}
