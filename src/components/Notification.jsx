import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function Notification({ notification, onDismiss }) {
  useEffect(() => {
    if (!notification) return undefined;
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const Icon = icons[notification.type] || icons.info;
  const isError = notification.type === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className="fixed left-1/2 top-3 z-50 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 shadow-lg"
    >
      <Icon className={`h-4 w-4 shrink-0 ${isError ? 'text-red-400' : notification.type === 'success' ? 'text-emerald-400' : 'text-sky-400'}`} />
      <span className="min-w-0 flex-1">{notification.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}