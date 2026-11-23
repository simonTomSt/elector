import { useEffect, useState, type FC } from 'react';
import { useSimStore } from '@/store/sim';
import './ShortToast.css';

interface ToastMsg {
  key: string;
  text: string;
  level: 'error' | 'warn';
}

export const ShortToast: FC = () => {
  const events = useSimStore((s) => s.view.events);
  const [visible, setVisible] = useState<ToastMsg | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (events.length === 0) return;
    const last = events[events.length - 1];
    if (!last) return;
    if (last.level !== 'error' && last.level !== 'warn') return;
    const key = `${last.t}-${last.text}`;
    if (dismissed.has(key)) return;
    setVisible({ key, text: last.text, level: last.level });
  }, [events, dismissed]);

  if (!visible) return null;

  const onClose = (): void => {
    setDismissed((s) => {
      const n = new Set(s);
      n.add(visible.key);
      return n;
    });
    setVisible(null);
  };

  return (
    <div
      role="alert"
      className={`short-toast short-toast--${visible.level}`}
      data-testid="short-toast"
    >
      <div className="short-toast__icon" aria-hidden="true">
        ⚠
      </div>
      <div className="short-toast__body">
        <div className="short-toast__title">
          {visible.level === 'error' ? 'Zwarcie / zadziałanie' : 'Ostrzeżenie'}
        </div>
        <div className="short-toast__text">{visible.text}</div>
      </div>
      <button type="button" className="short-toast__close" onClick={onClose}>
        Zamknij
      </button>
    </div>
  );
};
