import { useState, type FC } from 'react';
import { useProjectStore } from '@/store/project';
import { useDiagnosticStore } from '@/store/diagnostic';
import { useResultStore } from '@/store/result';
import { loadProgress, saveProgress } from '@/store/persist';

interface Props {
  open: boolean;
  onClose(): void;
}

export const ReportFaultModal: FC<Props> = ({ open, onClose }) => {
  const task = useProjectStore((s) => s.task);
  const report = useDiagnosticStore((s) => s.report);
  const setResult = useResultStore((s) => s.setResult);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<
    | { kind: 'ok'; text: string }
    | { kind: 'err'; text: string; assigned: readonly string[] }
    | null
  >(null);

  if (!open || !task || task.type !== 'diagnostic') return null;
  const faults = task.faults ?? [];

  const toggle = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = (): void => {
    const picked = [...selected];
    const r = report(picked);
    if (r.correct) {
      setFeedback({ kind: 'ok', text: 'Trafiona usterka. Dobra diagnoza.' });
      // zapis wyniku w progress
      const now = Date.now();
      const prog = loadProgress();
      saveProgress({
        ...prog,
        [task.id]: {
          status: 'ukonczone',
          updatedAt: now,
          completedAt: now,
          score: 100,
        },
      });
      // Pokaż też raport „Sprawdź rozwiązanie" z wynikiem 100
      setResult({
        value: 100,
        max: 100,
        passed: true,
        items: faults
          .filter((f) => picked.includes(f.id))
          .map((f) => ({ id: f.id, text: `Wykryto: ${f.label}`, ok: true })),
        penalties: { loto: 0, hints: 0 },
      });
      setTimeout(onClose, 1200);
    } else {
      const assigned = r.assigned;
      const assignedLabels = faults
        .filter((f) => assigned.includes(f.id))
        .map((f) => f.label)
        .join(', ');
      setFeedback({
        kind: 'err',
        text: `Zła diagnoza. Właściwa usterka: ${assignedLabels}`,
        assigned,
      });
      const now = Date.now();
      const prog = loadProgress();
      saveProgress({
        ...prog,
        [task.id]: {
          status: 'w-toku',
          updatedAt: now,
          score: 0,
        },
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Zgłoszenie usterki"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--theme-panel)',
          color: 'var(--theme-fg)',
          borderRadius: 8,
          border: '1px solid var(--theme-border)',
          minWidth: 520,
          maxWidth: 680,
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
            <div style={{ fontSize: 14, color: 'var(--theme-muted)' }}>Diagnostyka</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>
              Zgłoś usterkę
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
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
          {feedback ? (
            <div
              role="status"
              style={{
                padding: 12,
                borderRadius: 8,
                marginBottom: 10,
                background:
                  feedback.kind === 'ok'
                    ? 'rgba(63,207,142,0.12)'
                    : 'rgba(240,86,79,0.12)',
                color: feedback.kind === 'ok' ? '#3FCF8E' : '#FF8A84',
                fontSize: 14,
              }}
            >
              {feedback.text}
            </div>
          ) : (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--theme-muted)' }}>
              Zaznacz usterkę, którą udało Ci się zdiagnozować. Masz jedną próbę.
            </p>
          )}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {faults.map((f) => (
              <li
                key={f.id}
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid var(--theme-border)',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selected.has(f.id)}
                    onChange={() => toggle(f.id)}
                    disabled={feedback !== null}
                    aria-label={`Wybierz usterkę ${f.id}`}
                  />
                  <span>{f.label}</span>
                  <span className="mono" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--theme-muted)' }}>
                    {f.id}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        {!feedback && (
          <footer style={{ padding: '12px 20px', borderTop: '1px solid var(--theme-border)' }}>
            <button
              type="button"
              onClick={onSubmit}
              disabled={selected.size === 0}
              className="topbar__cta"
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid var(--theme-accent)',
                background: 'var(--theme-accent)',
                color: 'var(--theme-bg)',
                cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
                opacity: selected.size === 0 ? 0.6 : 1,
              }}
            >
              Zgłoś wybrane usterki
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};
