import type { FC } from 'react';
import { useSchematicStore, type SchematicTool } from '@/store/schematic';

const TOOLS: readonly { id: SchematicTool; name: string; key: string; d: string }[] = [
  { id: 'select', name: 'Zaznacz', key: 'V', d: 'M5 3l14 8-6 2-2 6z' },
  { id: 'wire', name: 'Połączenie', key: 'W', d: 'M4 6h6v12h10 M4 6a1 1 0 1 0 0.01 0' },
  { id: 'node', name: 'Węzeł', key: 'J', d: 'M12 4v16 M4 12h8 M12 12a2.5 2.5 0 1 0 0.01 0' },
  { id: 'pot', name: 'Potencjał', key: 'P', d: 'M4 6h16 M12 6v14' },
  { id: 'text', name: 'Tekst', key: 'T', d: 'M5 6h14 M12 6v13' },
];

export const SchematicToolbar: FC = () => {
  const tool = useSchematicStore((s) => s.tool);
  const setTool = useSchematicStore((s) => s.setTool);
  return (
    <div
      role="toolbar"
      aria-label="Narzędzia schematu"
      style={{
        position: 'absolute',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 4,
        padding: 6,
        borderRadius: 12,
        background: 'var(--theme-panel)',
        border: '1px solid var(--theme-line2)',
        boxShadow: 'var(--theme-shadow)',
        zIndex: 5,
      }}
    >
      {TOOLS.map((t) => {
        const sel = tool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={sel}
            onClick={() => setTool(t.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 44,
              padding: '0 12px',
              borderRadius: 8,
              cursor: 'pointer',
              font: 'inherit',
              fontSize: 13,
              background: sel ? 'var(--theme-accentSoft)' : 'transparent',
              color: sel ? 'var(--theme-accent)' : 'var(--theme-text)',
              border: `1px solid ${sel ? 'var(--theme-accent)' : 'transparent'}`,
            }}
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d={t.d} />
            </svg>
            {t.name}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                padding: '1px 4px',
                borderRadius: 3,
                border: '1px solid var(--theme-line2)',
                color: 'var(--theme-muted)',
              }}
            >
              {t.key}
            </span>
          </button>
        );
      })}
    </div>
  );
};
