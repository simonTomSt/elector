import type { FC, PointerEvent } from 'react';
import type { SchematicSymbol, TerminalRef } from '@/domain/types';
import { SYMBOLS } from './symbols';

interface Props {
  symbol: SchematicSymbol;
  selected?: boolean;
  dragging?: boolean;
  onSelect?: (id: string) => void;
  onBodyPointerDown?: (id: string, e: PointerEvent<SVGElement>) => void;
  onPinDown?: (pin: TerminalRef, pos: { x: number; y: number }) => void;
  onPinUp?: (pin: TerminalRef) => void;
  highlightPins?: ReadonlySet<TerminalRef>;
}

export const SymbolView: FC<Props> = ({
  symbol,
  selected,
  dragging,
  onSelect,
  onBodyPointerDown,
  onPinDown,
  onPinUp,
  highlightPins,
}) => {
  const spec = SYMBOLS[symbol.element];
  const x = symbol.x ?? 0;
  const y = symbol.y ?? 0;
  const strokeWidth = spec.strokeKind === 'power' ? 1.9 : 1.6;

  const onBodyDown = (e: PointerEvent<SVGElement>): void => {
    e.stopPropagation();
    onSelect?.(symbol.id);
    onBodyPointerDown?.(symbol.id, e);
  };

  return (
    <g
      transform={`translate(${x}, ${y})`}
      data-sym={symbol.id}
      style={{ opacity: dragging ? 0.7 : 1 }}
    >
      {selected && (
        <rect
          x={-2}
          y={-2}
          width={spec.width + 4}
          height={spec.height + 4}
          rx={4}
          fill="var(--theme-accentSoft)"
          stroke="var(--theme-accent)"
          strokeWidth={1.4}
          strokeDasharray="5 3"
        />
      )}
      <rect
        x={0}
        y={0}
        width={spec.width}
        height={spec.height}
        fill="transparent"
        onPointerDown={onBodyDown}
        style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      />
      <path
        d={spec.path}
        fill="none"
        stroke="var(--schematic-theme-ink)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />
      <text
        x={spec.width + 6}
        y={14}
        fontSize={11}
        fontWeight={600}
        fill="var(--schematic-theme-ink)"
        pointerEvents="none"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {symbol.tag}
      </text>
      {spec.pins.map((pin, i) => {
        const ref = symbol.pins[i] ?? `${symbol.tag}:${pin.id}`;
        const hot = highlightPins?.has(ref);
        return (
          <g key={pin.id}>
            <circle
              cx={pin.x}
              cy={pin.y}
              r={hot ? 5.2 : 3.2}
              fill="var(--schematic-theme-paper)"
              stroke={hot ? 'var(--theme-accent)' : 'var(--schematic-theme-ink)'}
              strokeWidth={hot ? 1.8 : 1.2}
              onPointerDown={(e) => {
                e.stopPropagation();
                onPinDown?.(ref, { x: x + pin.x, y: y + pin.y });
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onPinUp?.(ref);
              }}
              style={{ cursor: 'crosshair' }}
            />
            <text
              x={pin.x + 6}
              y={pin.y + 3}
              fontSize={8}
              fill="var(--schematic-theme-muted)"
              pointerEvents="none"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {pin.id}
            </text>
          </g>
        );
      })}
    </g>
  );
};
