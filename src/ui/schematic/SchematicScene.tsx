import { useEffect, useMemo, useRef, useState, type FC, type MouseEvent } from 'react';
import { buildOrthoRoute } from '@/domain/routing';
import { useSchematicStore } from '@/store/schematic';
import type { TerminalRef } from '@/domain/types';
import { Sheet, SHEET_H, SHEET_W } from './Sheet';
import { SymbolView } from './SymbolView';
import { ConnectionView } from './ConnectionView';
import { SYMBOLS } from './symbols';

interface Props {
  stateLabel?: string | undefined;
}

const snap10 = (v: number): number => Math.round(v / 10) * 10;

export const SchematicScene: FC<Props> = ({ stateLabel }) => {
  const symbols = useSchematicStore((s) => s.symbols);
  const connections = useSchematicStore((s) => s.connections);
  const potentials = useSchematicStore((s) => s.potentials);
  const selectedSymbolId = useSchematicStore((s) => s.selectedSymbolId);
  const selectSymbol = useSchematicStore((s) => s.selectSymbol);
  const tool = useSchematicStore((s) => s.tool);
  const draft = useSchematicStore((s) => s.draft);
  const beginWire = useSchematicStore((s) => s.beginWire);
  const commitWire = useSchematicStore((s) => s.commitWire);
  const updateDraftCursor = useSchematicStore((s) => s.updateDraftCursor);
  const addDraftBend = useSchematicStore((s) => s.addDraftBend);
  const cancelWire = useSchematicStore((s) => s.cancelWire);
  const pinPositions = useMemo(() => {
    const map = new Map<TerminalRef, { x: number; y: number }>();
    for (const sym of symbols) {
      const spec = SYMBOLS[sym.element];
      spec.pins.forEach((p, i) => {
        const ref = sym.pins[i];
        if (!ref) return;
        map.set(ref, { x: (sym.x ?? 0) + p.x, y: (sym.y ?? 0) + p.y });
      });
    }
    return map;
  }, [symbols]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  const toSvg = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const m = svg.getScreenCTM()?.inverse();
    if (!m) return null;
    const p = pt.matrixTransform(m);
    return { x: snap10(p.x), y: snap10(p.y) };
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        cancelWire();
        selectSymbol(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancelWire, selectSymbol]);

  const highlightPins = useMemo<Set<TerminalRef>>(() => {
    const out = new Set<TerminalRef>();
    if (draft) {
      for (const [p] of pinPositions) if (p !== draft.from) out.add(p);
    }
    return out;
  }, [draft, pinPositions]);

  const onPinDown = (pin: TerminalRef, pos: { x: number; y: number }): void => {
    if (tool !== 'wire') return;
    beginWire(pin, pos);
  };

  const onPinUp = (pin: TerminalRef): void => {
    if (!draft) return;
    commitWire(pin);
  };

  const onBgMove = (e: MouseEvent<SVGSVGElement>): void => {
    if (!draft) return;
    const p = toSvg(e.clientX, e.clientY);
    if (p) updateDraftCursor(p);
  };

  const onBgClick = (e: MouseEvent<SVGSVGElement>): void => {
    if (draft) {
      const p = toSvg(e.clientX, e.clientY);
      if (p) addDraftBend(p);
      return;
    }
    selectSymbol(null);
  };

  const draftRoute = draft
    ? buildOrthoRoute(
        { xMm: draft.origin.x, yMm: draft.origin.y },
        draft.bends.map((b) => ({ xMm: b.x, yMm: b.y })),
        { xMm: draft.cursor.x, yMm: draft.cursor.y },
      ).map(([x, y]) => ({ x, y }))
    : [];

  return (
    <div
      ref={setContainerRef}
      style={{
        width: '100%',
        maxWidth: 1040,
        boxShadow: 'var(--theme-shadow)',
        borderRadius: 6,
        position: 'relative',
      }}
    >
      <Sheet stateLabel={stateLabel}>
        <svg
          ref={svgRef}
          x={0}
          y={0}
          width={SHEET_W}
          height={SHEET_H}
          viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
          style={{ overflow: 'visible' }}
          onMouseMove={onBgMove}
          onClick={onBgClick}
        >
          {/* istniejące połączenia */}
          {connections.map(([a, b], i) => {
            const pa = pinPositions.get(a);
            const pb = pinPositions.get(b);
            if (!pa || !pb) return null;
            const pts = buildOrthoRoute(
              { xMm: pa.x, yMm: pa.y },
              [],
              { xMm: pb.x, yMm: pb.y },
            ).map(([x, y]) => ({ x, y }));
            return <ConnectionView key={`c${i}`} points={pts} />;
          })}
          {/* etykiety potencjałów */}
          {potentials.map((p) => (
            <g key={p.id} transform={`translate(${p.x ?? 0}, ${p.y ?? 0})`}>
              <path
                d="M-12 0 H12 M0 0 V18 M-4 12 L0 18 L4 12"
                stroke="var(--schematic-theme-ink)"
                strokeWidth={1.4}
                fill="none"
              />
              <text
                x={0}
                y={-4}
                fontSize={10}
                fontWeight={600}
                fill="var(--schematic-theme-ink)"
                textAnchor="middle"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {p.name}
              </text>
            </g>
          ))}
          {/* draft */}
          {draftRoute.length > 1 && (
            <ConnectionView points={draftRoute} color="var(--theme-accent)" width={2.2} />
          )}
          {/* symbole */}
          {symbols.map((sym) => (
            <SymbolView
              key={sym.id}
              symbol={sym}
              selected={selectedSymbolId === sym.id}
              onSelect={selectSymbol}
              onPinDown={onPinDown}
              onPinUp={onPinUp}
              highlightPins={highlightPins}
            />
          ))}
        </svg>
      </Sheet>
      {containerRef && null /* zarezerwowane pod minimapę */}
    </div>
  );
};
