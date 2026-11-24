import { useEffect, useState, type FC } from 'react';

interface Shortcut {
  keys: string;
  desc: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: '1', desc: 'Widok: Zadania' },
  { keys: '2', desc: 'Widok: Szafa' },
  { keys: '3', desc: 'Widok: Schemat' },
  { keys: '4', desc: 'Widok: Szafa + schemat' },
  { keys: '5', desc: 'Widok: Edytor zadań' },
  { keys: 'Ctrl/Cmd + Z', desc: 'Cofnij' },
  { keys: 'Ctrl/Cmd + Shift + Z', desc: 'Ponów' },
  { keys: 'Delete / Backspace', desc: 'Usuń zaznaczony aparat lub przewód (w szafie)' },
  { keys: 'Esc', desc: 'Anuluj rysowanie przewodu lub zamknij modal' },
  { keys: '?', desc: 'Pokaż tę listę skrótów' },
];

export const ShortcutsModal: FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const typing =
        tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
      if (e.key === '?' && !typing && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Skróty klawiaturowe"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--theme-panel)',
          color: 'var(--theme-fg)',
          borderRadius: 8,
          border: '1px solid var(--theme-border)',
          minWidth: 420,
          maxWidth: 560,
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
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Skróty klawiaturowe</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Zamknij"
            style={{
              background: 'transparent',
              border: '1px solid var(--theme-border)',
              color: 'var(--theme-fg)',
              borderRadius: 4,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            Zamknij
          </button>
        </header>
        <div style={{ padding: '12px 20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              {SHORTCUTS.map((s) => (
                <tr key={s.keys}>
                  <td
                    style={{
                      padding: '6px 12px 6px 0',
                      verticalAlign: 'top',
                      width: '40%',
                    }}
                  >
                    <kbd
                      style={{
                        background: 'var(--theme-surface)',
                        border: '1px solid var(--theme-border)',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontFamily: 'var(--font-mono, ui-monospace)',
                        fontSize: 12,
                      }}
                    >
                      {s.keys}
                    </kbd>
                  </td>
                  <td style={{ padding: '6px 0' }}>{s.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
