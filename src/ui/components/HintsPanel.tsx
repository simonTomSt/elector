import type { FC } from 'react';
import { useProjectStore } from '@/store/project';
import { useHintsStore } from '@/store/hints';
import type { Hint } from '@/domain/types';

const LEVEL_LABEL: Record<NonNullable<Hint['level']>, string> = {
  subtelna: 'subtelna',
  bezpośrednia: 'bezpośrednia',
  rozwiązanie: 'rozwiązanie',
};

interface Props {
  variant?: 'inspector' | 'sidebar';
}

export const HintsPanel: FC<Props> = ({ variant = 'inspector' }) => {
  const task = useProjectStore((s) => s.task);
  const revealedIds = useHintsStore((s) => s.revealedIds);
  const hints = task?.hints ?? [];
  if (hints.length === 0) return null;
  const revealed = hints.filter((h) => revealedIds.includes(h.id));
  if (revealed.length === 0) return null;

  if (variant === 'sidebar') {
    return (
      <section
        aria-label="Podpowiedzi"
        style={{ padding: 16, borderTop: '1px solid var(--theme-line)' }}
      >
        <h2
          style={{
            margin: '0 0 8px',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--theme-muted)',
          }}
        >
          Podpowiedzi
        </h2>
        <ul
          data-testid="hints-panel"
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {revealed.map((h) => (
            <li key={h.id} style={{ fontSize: 13 }}>
              {h.level && (
                <span style={{ color: 'var(--theme-muted)', marginRight: 6, fontSize: 12 }}>
                  [{LEVEL_LABEL[h.level]}]
                </span>
              )}
              <span>{h.text}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <>
      <h2 className="inspector__title">Podpowiedzi</h2>
      <ul className="inspector__list" data-testid="hints-panel" style={{ gap: 8 }}>
        {revealed.map((h) => (
          <li key={h.id}>
            {h.level && (
              <span className="inspector__sub" style={{ marginRight: 6 }}>
                [{LEVEL_LABEL[h.level]}]
              </span>
            )}
            <span>{h.text}</span>
          </li>
        ))}
      </ul>
    </>
  );
};
