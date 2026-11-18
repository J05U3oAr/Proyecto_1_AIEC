import type {
  Action,
  ChatResponse,
  NavigationIntent,
  Source,
} from '@/services/contracts.generated';
import { isChatResponse, isProviderUrl } from '@/services/responseValidation';

export type NavigationNotice = {
  status: 'waiting' | 'requested' | 'blocked' | 'rejected' | 'cancelled' | 'expired';
  message: string;
  fallback?: Source;
};

// A small interface permits offline tests without pretending that a fake window is a real tab.
export interface ReservedTab {
  closed: boolean;
  opener: unknown;
  location: { href: string; replace(url: string): void };
  close(): void;
}

export type NavigationTicket = { finish(response: ChatResponse): void; cancel(): void };
export const RESERVATION_TIMEOUT_MS = 70_000;
// Length is checked by the schema; a negated class also rejects trailing line terminators.
const invalidIdentifier = /[^A-Za-z0-9_-]/;

export function validatedReference(
  response: unknown,
  requestId: string,
  intent: NavigationIntent
): Action | null {
  if (
    !isChatResponse(response) ||
    response.requestId !== requestId ||
    response.actions?.length !== 1
  )
    return null;
  const action = response.actions[0];
  if (
    action.type !== 'open_reference' ||
    invalidIdentifier.test(action.id) ||
    action.requestId !== requestId ||
    action.provider !== intent.provider ||
    !isProviderUrl(action.url, action.provider)
  )
    return null;
  if (intent.provider === 'imdb') {
    if (response.movies?.length !== 1 || response.movies[0].imdb !== action.url) return null;
  } else {
    const adaptation = response.comparison?.adaptation;
    if (
      adaptation?.status !== 'confirmed' ||
      adaptation.book?.id !== action.resourceId ||
      adaptation.book.url !== action.url
    )
      return null;
  }
  return action;
}

/** No effects at render time. One single-use reservation per explicitly authorized send. */
export class ReferenceNavigator {
  private readonly usedActions = new Set<string>();

  constructor(
    private readonly openTab: () => ReservedTab | null = () => window.open('about:blank', '_blank')
  ) {}

  reserve(
    requestId: string,
    intent: NavigationIntent,
    notify: (notice: NavigationNotice) => void
  ): NavigationTicket {
    let tab: ReservedTab | null = null;
    const close = () => {
      // Do not overwrite or close a tab that the user has navigated elsewhere while waiting.
      try {
        if (tab && !tab.closed && tab.location.href === 'about:blank') tab.close();
      } catch {
        /* User took over a cross-origin tab. */
      }
      tab = null;
    };
    try {
      tab = this.openTab();
      if (tab) {
        tab.opener = null;
        if (tab.opener !== null) {
          close();
        }
      }
    } catch {
      close();
    }
    notify({
      status: 'waiting',
      message:
        'Preparando la referencia solicitada. La apertura depende de los permisos del navegador.',
    });
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      close();
      notify({
        status: 'expired',
        message: 'Venció la espera para abrir la referencia. No se reintentó la apertura.',
      });
    }, RESERVATION_TIMEOUT_MS);
    const cancel = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      close();
      notify({ status: 'cancelled', message: 'Se canceló la apertura de la referencia.' });
    };
    return {
      cancel,
      finish: response => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        const action = validatedReference(response, requestId, intent);
        if (!action || this.usedActions.has(action.id)) {
          close();
          notify({
            status: 'rejected',
            message:
              'No se abrió ninguna referencia: no recibí una acción nueva válida para esta solicitud.',
          });
          return;
        }
        this.usedActions.add(action.id);
        if (this.usedActions.size > 1024)
          this.usedActions.delete(this.usedActions.values().next().value!);
        const fallback: Source = {
          provider: action.provider,
          url: action.url,
          label: action.provider === 'imdb' ? 'Abrir ficha en IMDb' : 'Abrir libro en Google Books',
        };
        try {
          if (!tab || tab.closed || tab.location.href !== 'about:blank' || tab.opener !== null)
            throw new Error('Reservation unavailable');
          tab.location.replace(action.url);
          tab = null;
          notify({
            status: 'requested',
            message:
              'Se envió la referencia a la pestaña reservada. Si no la ves, utiliza el enlace.',
            fallback,
          });
        } catch {
          close();
          notify({
            status: 'blocked',
            message:
              'No pude usar la pestaña reservada. El navegador puede haberla bloqueado o cerrado. Puedes abrir el enlace seguro.',
            fallback,
          });
        }
      },
    };
  }
}

export const referenceNavigator = new ReferenceNavigator();
