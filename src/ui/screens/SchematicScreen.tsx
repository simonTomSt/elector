import { useMemo, type FC } from 'react';
import { SymbolPalette } from '@/ui/schematic/SymbolPalette';
import { SchematicScene } from '@/ui/schematic/SchematicScene';
import { SchematicToolbar } from '@/ui/schematic/SchematicToolbar';
import { ErcPanel } from '@/ui/schematic/ErcPanel';
import { useSchematicStore } from '@/store/schematic';
import { buildSchematicNetlist, runErc } from '@/sim/schematic';
import { useProjectStore } from '@/store/project';

interface Props {
  slot?: 'palette' | 'stage' | 'right';
}

const StageFooter: FC = () => {
  const symbols = useSchematicStore((s) => s.symbols);
  const connections = useSchematicStore((s) => s.connections);
  const potentials = useSchematicStore((s) => s.potentials);
  const ercCount = useMemo(() => {
    const sch = { symbols, connections, potentials };
    return runErc(sch, buildSchematicNetlist(sch)).length;
  }, [symbols, connections, potentials]);
  const refs = symbols.filter((s) => s.element === 'reference').length;
  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        padding: '8px 12px',
        borderRadius: 8,
        background: 'var(--theme-panel)',
        border: '1px solid var(--theme-line2)',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--theme-muted)',
      }}
    >
      <span>Symbole {symbols.length}</span>
      <span>Połączenia {connections.length}</span>
      <span>Odsyłacze {refs}</span>
      <span style={{ color: ercCount > 0 ? 'var(--state-err-inkDark)' : 'var(--state-ok-color)' }}>
        ERC: {ercCount === 0 ? 'OK' : `${ercCount} błąd${ercCount === 1 ? '' : 'ów'}`}
      </span>
    </div>
  );
};

const SheetTabs: FC = () => (
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 8,
      padding: '8px 16px 0',
      background: 'var(--theme-panel)',
      borderBottom: '1px solid var(--theme-line)',
    }}
  >
    <div role="tablist" aria-label="Arkusze" style={{ display: 'flex', gap: 2 }}>
      <button
        type="button"
        role="tab"
        aria-selected
        style={{
          height: 44,
          padding: '0 16px',
          border: 'none',
          background: 'transparent',
          font: 'inherit',
          fontWeight: 500,
          color: 'var(--theme-text)',
          borderBottom: '2px solid var(--theme-accent)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)' }}>1</span> · Obwód główny i sterowanie
      </button>
      <button
        type="button"
        aria-label="Dodaj arkusz"
        disabled
        title="W wersji 1 jeden arkusz"
        style={{
          width: 44,
          height: 44,
          border: 'none',
          background: 'transparent',
          color: 'var(--theme-muted)',
          fontSize: 20,
        }}
      >
        +
      </button>
    </div>
    <span
      style={{
        paddingBottom: 12,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--theme-muted)',
      }}
    >
      A3 · siatka 10 · ortogonalnie
    </span>
  </div>
);

export const SchematicScreen: FC<Props> = ({ slot = 'stage' }) => {
  const task = useProjectStore((s) => s.task);

  if (slot === 'palette') {
    return <SymbolPalette />;
  }

  if (slot === 'right') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
        <section style={{ padding: 16, borderBottom: '1px solid var(--theme-line)' }}>
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
            Treść zadania
          </h2>
          <p style={{ margin: 0, fontSize: 14 }}>{task?.statement ?? ''}</p>
        </section>
        <ErcPanel />
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <SheetTabs />
      <div
        style={{
          position: 'relative',
          flex: '1 1 auto',
          minHeight: 600,
          padding: '72px 28px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--theme-stage)',
          overflow: 'auto',
        }}
      >
        <SchematicToolbar />
        <SchematicScene stateLabel="Edycja" />
        <StageFooter />
      </div>
    </div>
  );
};
