import { useEffect, type FC } from 'react';
import { useResultStore } from '@/store/result';

export const ResultModal: FC = () => {
  const open = useResultStore((s) => s.open);
  const result = useResultStore((s) => s.result);
  const hide = useResultStore((s) => s.hide);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') hide();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, hide]);

  if (!open || !result) return null;

  const title = result.passed ? 'Wynik: zaliczone' : 'Wynik: do poprawy';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={hide}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--theme-panel)',
          color: 'var(--theme-fg)',
          borderRadius: 8,
          border: '1px solid var(--theme-border)',
          minWidth: 480,
          maxWidth: 640,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--theme-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 14, color: 'var(--theme-muted)' }}>{title}</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }} className="mono">
              {result.value} / {result.max}
            </div>
          </div>
          <button
            type="button"
            onClick={hide}
            aria-label="Zamknij"
            style={{
              background: 'transparent',
              border: '1px solid var(--theme-border)',
              color: 'var(--theme-fg)',
              borderRadius: 4,
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            Zamknij
          </button>
        </header>
        <div style={{ padding: '12px 20px', overflow: 'auto' }}>
          {(result.penalties.loto > 0 || result.penalties.hints > 0) && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--theme-muted)',
                marginBottom: 12,
              }}
            >
              Kary:{' '}
              {result.penalties.loto > 0 ? `LOTO −${result.penalties.loto}` : ''}
              {result.penalties.loto > 0 && result.penalties.hints > 0 ? ' · ' : ''}
              {result.penalties.hints > 0 ? `podpowiedzi −${result.penalties.hints}` : ''}
            </div>
          )}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {result.items.map((it) => (
              <li
                key={it.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--theme-border)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    color: it.ok ? 'var(--theme-ok, #22c55e)' : 'var(--theme-err, #ef4444)',
                    fontWeight: 700,
                    width: 18,
                  }}
                >
                  {it.ok ? '✓' : '✗'}
                </span>
                <div style={{ flex: 1 }}>
                  <div>{it.text}</div>
                  {!it.ok && it.detail ? (
                    <div style={{ fontSize: 12, color: 'var(--theme-muted)', marginTop: 2 }}>
                      {it.detail}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
