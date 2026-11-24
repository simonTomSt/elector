import { useMemo, useState, type FC } from 'react';
import { useSchematicStore } from '@/store/schematic';
import { SYMBOLS, SYMBOL_GROUPS, symbolsInGroup, type SymbolSpec } from './symbols';

const filterGroups = (
  q: string,
): { id: string; name: string; items: SymbolSpec[] }[] =>
  SYMBOL_GROUPS.map((g) => ({
    id: g.id,
    name: g.name,
    items: symbolsInGroup(g.id).filter(
      (it) => !q || it.name.toLowerCase().includes(q),
    ),
  }));

interface Props {
  onPick?: (spec: SymbolSpec) => void;
}

const defaultTagFor = (spec: SymbolSpec, existingTags: readonly string[]): string => {
  const prefixMap: Partial<Record<string, string>> = {
    contactNO: '-K',
    contactNC: '-K',
    pbNO: '-S',
    pbNC: '-S',
    coil: '-K',
    coilTimer: '-K',
    thermalNC: '-F',
    thermalNO: '-F',
    thermal3: '-F',
    breaker3: '-Q',
    breaker1: '-F',
    mainContacts3: '-K',
    fuse: '-F',
    motor3: '-M',
    lamp: '-H',
    psu: '-T',
    terminal: '-X',
    potential: '',
    reference: '',
  };
  const prefix = prefixMap[spec.element] ?? '-X';
  if (!prefix) return 'N1';
  const used = new Set<number>();
  for (const t of existingTags) {
    if (!t.startsWith(prefix)) continue;
    const m = /^(\d+)/.exec(t.slice(prefix.length));
    if (m && m[1]) used.add(Number(m[1]));
  }
  let n = 1;
  while (used.has(n)) n += 1;
  return `${prefix}${n}`;
};

export const SymbolPalette: FC<Props> = ({ onPick }) => {
  const [query, setQuery] = useState('');
  const symbols = useSchematicStore((s) => s.symbols);
  const addSymbol = useSchematicStore((s) => s.addSymbol);
  const tool = useSchematicStore((s) => s.tool);

  const q = query.trim().toLowerCase();
  const groups = useMemo(() => filterGroups(q), [q]);

  const handlePick = (spec: SymbolSpec): void => {
    if (onPick) {
      onPick(spec);
      return;
    }
    // Domyślnie wrzuć na środek arkusza na siatkę 10.
    const existingTags = symbols.map((s) => s.tag);
    const tag = defaultTagFor(spec, existingTags);
    const pins = spec.pins.map((p) => `${tag}:${p.id}`);
    addSymbol(spec.element, tag, { x: 480, y: 300 }, pins);
  };

  return (
    <aside
      aria-label="Biblioteka symboli"
      style={{
        background: 'var(--theme-panel)',
        borderRight: '1px solid var(--theme-line)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div style={{ padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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
          Symbole IEC 60617
        </h2>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 44,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid var(--theme-line2)',
            background: 'var(--theme-surface)',
            color: 'var(--theme-muted)',
          }}
        >
          <span aria-hidden>🔍</span>
          <span className="sr-only" style={{ position: 'absolute', clip: 'rect(0 0 0 0)' }}>
            Szukaj symbolu
          </span>
          <input
            type="search"
            placeholder="Szukaj symbolu…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--theme-text)',
              font: 'inherit',
            }}
          />
        </label>
        {tool === 'wire' && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--theme-muted)' }}>
            Narzędzie Połączenie aktywne — zacznij od pinu i kliknij docelowy.
          </p>
        )}
      </div>
      <div style={{ padding: '0 10px 12px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        {groups.map((g) => {
          if (g.items.length === 0) return null;
          return (
            <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ padding: '0 6px', fontSize: 12, fontWeight: 600, color: 'var(--theme-muted)' }}>
                {g.name}
              </span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 6,
                }}
              >
                {g.items.map((it) => (
                  <button
                    key={it.element}
                    type="button"
                    aria-label={`Wstaw: ${it.name}`}
                    onClick={() => handlePick(it)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      minHeight: 76,
                      padding: '8px 4px',
                      borderRadius: 8,
                      cursor: 'grab',
                      font: 'inherit',
                      fontSize: 11,
                      textAlign: 'center',
                      color: 'var(--theme-text)',
                      background: 'var(--theme-surface)',
                      border: '1px solid transparent',
                    }}
                  >
                    <svg width={40} height={40} viewBox="0 0 40 40" aria-hidden>
                      <path
                        d={SYMBOLS[it.element].path}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {it.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
