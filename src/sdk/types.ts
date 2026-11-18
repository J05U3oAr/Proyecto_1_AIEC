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
  /** Trusted backend URL ending in /chat. No credentials or provider API URLs. */
  apiEndpoint?: string;
  agentName?: string;
  welcomeMessage?: string;
  avatarUrl?: string;
  position?: WidgetPosition;
  theme?: AGIChatTheme;
}
