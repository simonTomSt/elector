import { useMemo, type FC } from 'react';
import { useSchematicStore } from '@/store/schematic';
import { buildSchematicNetlist, runErc, type ErcIssue } from '@/sim/schematic';

export const ErcPanel: FC = () => {
  const symbols = useSchematicStore((s) => s.symbols);
  const connections = useSchematicStore((s) => s.connections);
  const potentials = useSchematicStore((s) => s.potentials);

  const issues = useMemo<ErcIssue[]>(() => {
    const sch = { symbols, connections, potentials };
    const nl = buildSchematicNetlist(sch);
    return runErc(sch, nl);
  }, [symbols, connections, potentials]);

  return (
    <section
      style={{
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--theme-muted)',
          }}
        >
          Kontrola schematu (ERC)
        </h2>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: issues.length === 0 ? 'var(--state-ok-color)' : 'var(--state-err-color)',
          }}
        >
          {issues.length === 0 ? 'OK' : `${issues.length} błąd${issues.length === 1 ? '' : 'ów'}`}
        </span>
      </div>
      {issues.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--theme-muted)' }}>
          Brak zastrzeżeń. Schemat jest spójny.
        </p>
      ) : (
        issues.map((i, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              gap: 10,
              padding: 10,
              borderRadius: 8,
              background: 'var(--state-err-soft)',
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                background: 'var(--state-err-color)',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '0 0 auto',
              }}
            >
              {idx + 1}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--state-err-inkDark)',
                }}
              >
                {i.text}
              </span>
              <span style={{ fontSize: 12, color: 'var(--theme-muted)' }}>{i.code}</span>
            </div>
          </div>
        ))
      )}
    </section>
  );
};
