import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import dol4kwRaw from '../../../tasks/examples/dol-4kw.json';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import { resolveState, useProjectStore } from '@/store/project';
import { useSchematicStore } from '@/store/schematic';
import { compareSchematicWithCabinet } from '@/sim/schematic';
import type { Schematic, TerminalRef } from '@/domain/types';
import { SceneView, ZoomToolbar } from '@/ui/scene';
import { SpoolToolbar } from '@/ui/scene/SpoolToolbar';
import { SchematicScene } from '@/ui/schematic/SchematicScene';
import { HintsPanel } from '@/ui/components/HintsPanel';

interface Props {
  slot?: 'palette' | 'stage' | 'right';
}

const RATIO_MIN = 0.25;
const RATIO_MAX = 0.75;
const RATIO_DEFAULT = 0.5;

/**
 * Most zaznaczenia szafa ↔ schemat.
 * Zmiana `selectedTag` (szafa) wybiera pierwszy symbol o tym `tag` na schemacie,
 * zmiana wybranego symbolu wybiera aparat o tym samym `tag` w szafie.
 */
const useSelectionBridge = (enabled: boolean): void => {
  const selectedTag = useProjectStore((s) => s.selectedTag);
  const selectDevice = useProjectStore((s) => s.selectDevice);
  const selectedSymbolId = useSchematicStore((s) => s.selectedSymbolId);
  const symbols = useSchematicStore((s) => s.symbols);
  const selectSymbol = useSchematicStore((s) => s.selectSymbol);

  // szafa → schemat
  useEffect(() => {
    if (!enabled) return;
    if (!selectedTag) {
      if (selectedSymbolId !== null) selectSymbol(null);
      return;
    }
    const sym = symbols.find((s) => s.tag === selectedTag);
    const desired = sym?.id ?? null;
    if (desired !== null && desired !== selectedSymbolId) selectSymbol(desired);
    // selectedSymbolId celowo poza zależnościami: nie chcemy zapętlenia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selectedTag, symbols, selectSymbol]);

  // schemat → szafa
  useEffect(() => {
    if (!enabled) return;
    const sym = symbols.find((s) => s.id === selectedSymbolId);
    const tag = sym?.tag ?? null;
    if (tag === null) return; // brak symbolu – nie czyścimy zaznaczenia szafy
    if (tag !== selectedTag) selectDevice(tag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selectedSymbolId, symbols, selectDevice]);
};

export const MixedScreen: FC<Props> = ({ slot = 'stage' }) => {
  const init = useProjectStore((s) => s.init);
  const task = useProjectStore((s) => s.task);
  const library = useProjectStore((s) => s.library);
  const devices = useProjectStore((s) => s.devices);
  const wires = useProjectStore((s) => s.wires);
  const selectedTag = useProjectStore((s) => s.selectedTag);
  const symbols = useSchematicStore((s) => s.symbols);
  const connections = useSchematicStore((s) => s.connections);
  const potentials = useSchematicStore((s) => s.potentials);

  useEffect(() => {
    if (task && library) return;
    const lib = loadDeviceLibrary();
    const t = loadTask(dol4kwRaw, { devices: lib });
    init(t, lib);
  }, [init, task, library]);

  // Most zaznaczenia aktywujemy tylko w jednym slocie, żeby refy nie dublowały się.
  useSelectionBridge(slot === 'stage');

  const [ratio, setRatio] = useState<number>(RATIO_DEFAULT);
  const splitRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const onSplitterDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    (e.currentTarget as unknown as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
  };
  const onSplitterMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) return;
    const rect = splitRef.current?.getBoundingClientRect();
    if (!rect) return;
    const r = (e.clientX - rect.left) / rect.width;
    setRatio(Math.max(RATIO_MIN, Math.min(RATIO_MAX, r)));
  };
  const onSplitterUp = (e: ReactPointerEvent<HTMLDivElement>): void => {
    (e.currentTarget as unknown as Element).releasePointerCapture?.(e.pointerId);
    draggingRef.current = false;
  };
  const onSplitterKey = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'ArrowLeft') setRatio((r) => Math.max(RATIO_MIN, r - 0.05));
    else if (e.key === 'ArrowRight') setRatio((r) => Math.min(RATIO_MAX, r + 0.05));
    else if (e.key === 'Home') setRatio(RATIO_DEFAULT);
  };

  const project = useMemo(() => {
    if (!task || !library) return null;
    return resolveState({ devices, wires, library });
  }, [task, library, devices, wires]);

  const schematic = useMemo<Schematic>(
    () => ({ symbols, connections, potentials }),
    [symbols, connections, potentials],
  );

  const diffs = useMemo(() => {
    if (!project) return [];
    return compareSchematicWithCabinet(schematic, project);
  }, [schematic, project]);

  const linksForSelected = useMemo(() => {
    if (!selectedTag || !project) return [];
    const dev = project.byTag.get(selectedTag);
    if (!dev) return [];
    const sep = dev.type.kind === 'terminal' ? '.' : ':';
    // zbiór pinów symboli o tym tagu na schemacie
    const schPinsByTerminal = new Map<string, TerminalRef[]>();
    for (const s of symbols) {
      if (s.tag !== selectedTag) continue;
      for (const p of s.pins) {
        const term = p.slice(selectedTag.length + 1);
        const list = schPinsByTerminal.get(term);
        if (list) list.push(p);
        else schPinsByTerminal.set(term, [p]);
      }
    }
    // dla każdego zacisku aparatu – szukaj w diffs odpowiadającego terminala
    return dev.type.terminals.map((t) => {
      const ref = `${selectedTag}${sep}${t.id}`;
      const onSchematic = schPinsByTerminal.has(t.id);
      const diff = diffs.find((d) => d.terminal === ref);
      const matches = !diff;
      return {
        terminal: t.id,
        ref,
        onSchematic,
        matches,
        detail: diff
          ? {
              inSchematic: diff.inSchematic,
              inCabinet: diff.inCabinet,
            }
          : null,
      };
    });
  }, [selectedTag, project, symbols, diffs]);

  if (!task || !library || !project) {
    return <div style={{ color: 'var(--theme-muted)' }}>Ładowanie zadania…</div>;
  }

  if (slot === 'palette') {
    return (
      <section
        aria-label="Legenda widoku mieszanego"
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
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
          Widok mieszany
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--theme-text)' }}>
          Zaznacz aparat w szafie lub na schemacie – zaznaczenie synchronizuje się między widokami.
        </p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--theme-muted)' }}>
          Pod spodem widzisz tabelę powiązań dla zaznaczenia, a w prawym panelu listę niezgodności
          schemat ↔ szafa.
        </p>
      </section>
    );
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
          <p style={{ margin: 0, fontSize: 14 }}>{task.statement ?? ''}</p>
        </section>
        <section
          aria-label="Niezgodności schemat ↔ szafa"
          style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
        >
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
            Schemat ↔ szafa
          </h2>
          {diffs.length === 0 ? (
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                background: 'var(--state-ok-bg, rgba(63,207,142,0.12))',
                color: 'var(--state-ok-color, #3FCF8E)',
                fontSize: 13,
              }}
            >
              Sieci schematu i szafy są zgodne.
            </div>
          ) : (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {diffs.map((d, i) => (
                <li
                  key={`${d.terminal}-${i}`}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    background: 'rgba(240,86,79,0.10)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--state-err-inkDark, #FF8A84)',
                    }}
                  >
                    Niezgodność przy {d.terminal}
                  </span>
                  {d.inSchematic.length > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--theme-muted)' }}>
                      schemat ↗ {d.inSchematic.join(', ')}
                    </span>
                  )}
                  {d.inCabinet.length > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--theme-muted)' }}>
                      szafa ↗ {d.inCabinet.join(', ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <HintsPanel variant="sidebar" />
      </div>
    );
  }

  const schHasSelected = !!selectedTag && symbols.some((s) => s.tag === selectedTag);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        gap: 12,
      }}
    >
      <div
        ref={splitRef}
        style={{
          display: 'flex',
          alignItems: 'stretch',
          flex: '1 1 auto',
          minHeight: 0,
          gap: 0,
        }}
      >
        <section
          aria-label="Szafa"
          style={{
            flex: `${ratio} 1 0`,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 10,
            background: 'var(--theme-panel)',
            border: '1px solid var(--theme-line2)',
            overflow: 'hidden',
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              height: 44,
              borderBottom: '1px solid var(--theme-line2)',
            }}
          >
            <span style={{ fontWeight: 600 }}>
              Szafa <span style={{ fontWeight: 400, color: 'var(--theme-muted)' }}>· płyta montażowa</span>
            </span>
          </header>
          <div
            style={{
              position: 'relative',
              flex: '1 1 auto',
              minHeight: 0,
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SceneView task={task} project={project} />
            <SpoolToolbar />
            <ZoomToolbar />
          </div>
        </section>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Zmień proporcje paneli"
          aria-valuenow={Math.round(ratio * 100)}
          aria-valuemin={Math.round(RATIO_MIN * 100)}
          aria-valuemax={Math.round(RATIO_MAX * 100)}
          tabIndex={0}
          onPointerDown={onSplitterDown}
          onPointerMove={onSplitterMove}
          onPointerUp={onSplitterUp}
          onPointerCancel={onSplitterUp}
          onKeyDown={onSplitterKey}
          style={{
            flex: '0 0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'col-resize',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          <span
            style={{
              display: 'block',
              width: 4,
              height: 40,
              borderRadius: 2,
              background: 'var(--theme-line2)',
            }}
          />
        </div>

        <section
          aria-label="Schemat"
          style={{
            flex: `${1 - ratio} 1 0`,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 10,
            background: 'var(--theme-panel)',
            border: '1px solid var(--theme-line2)',
            overflow: 'hidden',
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              height: 44,
              borderBottom: '1px solid var(--theme-line2)',
            }}
          >
            <span style={{ fontWeight: 600 }}>
              Schemat <span style={{ fontWeight: 400, color: 'var(--theme-muted)' }}>· arkusz 1</span>
            </span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: 'var(--theme-muted)',
              }}
            >
              tylko do odczytu
            </span>
          </header>
          <div
            style={{
              flex: '1 1 auto',
              minHeight: 0,
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
            }}
          >
            <SchematicScene stateLabel="Mieszany" />
          </div>
        </section>
      </div>

      <section
        aria-label={`Powiązania ${selectedTag ?? ''}`}
        style={{
          flex: '0 0 auto',
          borderRadius: 10,
          background: 'var(--theme-panel)',
          border: '1px solid var(--theme-line2)',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 24,
              padding: '0 10px',
              borderRadius: 12,
              background: 'var(--theme-accentSoft)',
              color: 'var(--theme-accent)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Zaznaczenie zsynchronizowane
          </span>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
            {selectedTag ? (
              <>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedTag}</span> ·{' '}
                {schHasSelected ? 'w szafie i na schemacie' : 'tylko w szafie'}
              </>
            ) : (
              <span style={{ color: 'var(--theme-muted)' }}>Zaznacz aparat, aby zobaczyć powiązania</span>
            )}
          </h2>
        </header>
        {selectedTag && linksForSelected.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--theme-muted)', fontSize: 12 }}>
                <th
                  scope="col"
                  style={{
                    padding: '6px 8px',
                    fontWeight: 500,
                    borderBottom: '1px solid var(--theme-line2)',
                  }}
                >
                  Zacisk
                </th>
                <th
                  scope="col"
                  style={{
                    padding: '6px 8px',
                    fontWeight: 500,
                    borderBottom: '1px solid var(--theme-line2)',
                  }}
                >
                  Schemat
                </th>
                <th
                  scope="col"
                  style={{
                    padding: '6px 8px',
                    fontWeight: 500,
                    borderBottom: '1px solid var(--theme-line2)',
                  }}
                >
                  Szafa
                </th>
                <th
                  scope="col"
                  style={{
                    padding: '6px 8px',
                    fontWeight: 500,
                    borderBottom: '1px solid var(--theme-line2)',
                  }}
                >
                  Zgodność
                </th>
              </tr>
            </thead>
            <tbody>
              {linksForSelected.map((l) => (
                <tr
                  key={l.ref}
                  style={{
                    background: l.matches ? 'transparent' : 'rgba(240,86,79,0.08)',
                  }}
                >
                  <td
                    style={{
                      padding: 8,
                      borderBottom: '1px solid var(--theme-line2)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {l.terminal}
                  </td>
                  <td
                    style={{
                      padding: 8,
                      borderBottom: '1px solid var(--theme-line2)',
                      fontFamily: 'var(--font-mono)',
                      color: l.onSchematic ? 'var(--theme-text)' : 'var(--theme-muted)',
                    }}
                  >
                    {l.onSchematic ? 'na arkuszu' : '—'}
                  </td>
                  <td
                    style={{
                      padding: 8,
                      borderBottom: '1px solid var(--theme-line2)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {l.detail && l.detail.inCabinet.length > 0
                      ? l.detail.inCabinet.join(', ')
                      : l.detail && l.detail.inSchematic.length > 0
                        ? 'brak w szafie'
                        : 'zgodne'}
                  </td>
                  <td
                    style={{
                      padding: 8,
                      borderBottom: '1px solid var(--theme-line2)',
                      fontWeight: 600,
                      color: l.matches
                        ? 'var(--state-ok-color, #3FCF8E)'
                        : 'var(--state-err-inkDark, #FF8A84)',
                    }}
                  >
                    {l.matches ? '✓ zgodne' : '✗ różni się'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

