import { useChatStore } from '@/store/useChatStore';
import { SourceLink } from '@/components/widget/results/ResultSources';

export function NavigationStatus() {
  const notice = useChatStore(state => state.navigationNotice);
  if (!notice) return null;
  return (
    <div className="mt-2 space-y-1 text-sm text-[var(--agichat-text)]">
      <p role="status">{notice.message}</p>
      {notice.fallback && <SourceLink source={notice.fallback}>{notice.fallback.label}</SourceLink>}
    </div>
  );
}
