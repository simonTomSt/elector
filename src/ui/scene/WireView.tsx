import type { FC, PointerEvent as ReactPointerEvent } from 'react';
import type { Wire, WireColor } from '@/domain/types';
import { tokens } from '@/ui/theme/tokens';
import { mmToPx } from './layout';
import { roundedOrthogonalPath } from './routing';

const WIRE_CSS_VAR: Record<WireColor, string> = {
  brown: 'var(--wire-brown-color)',
  black: 'var(--wire-black-color)',
  grey: 'var(--wire-grey-color)',
  blue: 'var(--wire-blue-color)',
  greenYellow: 'var(--wire-greenYellow-color)',
  darkBlue: 'var(--wire-darkBlue-color)',
  red: '#B53029',
  white: '#E7ECF1',
};

const strokeWidthFor = (cs: Wire['cs']): number => {
  if (cs <= 0.75) return tokens.wire.width.core * 0.85;
  if (cs <= 1.5) return tokens.wire.width.core;
  if (cs <= 2.5) return tokens.wire.width.core * 1.2;
  return tokens.wire.width.core * 1.4;
};

export interface WireRuntimeFlags {
  live: boolean;
  flow: boolean;
  short: boolean;
}

interface Props {
  wire: Wire;
  fallbackStart?: { xMm: number; yMm: number } | undefined;
  fallbackEnd?: { xMm: number; yMm: number } | undefined;
  selected?: boolean;
  runtime?: WireRuntimeFlags | undefined;
  onPointerDown?: (id: string, e: ReactPointerEvent<SVGGElement>) => void;
}

const buildStraightPath = (
  start: { xMm: number; yMm: number },
  end: { xMm: number; yMm: number },
): string => `M${mmToPx(start.xMm)} ${mmToPx(start.yMm)} L${mmToPx(end.xMm)} ${mmToPx(end.yMm)}`;

export const WireView: FC<Props> = ({
  wire,
  fallbackStart,
  fallbackEnd,
  selected = false,
  runtime,
  onPointerDown,
}) => {
  let d = '';
  if (wire.route && wire.route.length >= 2) {
    d = roundedOrthogonalPath(wire.route);
  } else if (fallbackStart && fallbackEnd) {
    d = buildStraightPath(fallbackStart, fallbackEnd);
    if (typeof console !== 'undefined') {
      console.warn(
        `WireView: przewód ${wire.id} (${wire.a} ↔ ${wire.b}) nie ma route – rysuję po prostej`,
      );
    }
  } else {
    return null;
  }

  const core = WIRE_CSS_VAR[wire.color];
  const haloW = strokeWidthFor(wire.cs) + 2;
  const coreW = strokeWidthFor(wire.cs);
  const isPe = wire.color === 'greenYellow';

  const isLive = runtime?.live === true;
  const isFlow = runtime?.flow === true;
  const isShort = runtime?.short === true;

  return (
    <g
      data-wire={wire.id}
      data-selected={selected ? '1' : '0'}
      data-live={isLive ? '1' : '0'}
      data-flow={isFlow ? '1' : '0'}
      data-short={isShort ? '1' : '0'}
      onPointerDown={onPointerDown ? (e) => onPointerDown(wire.id, e) : undefined}
      style={onPointerDown ? { cursor: 'pointer' } : undefined}
    >
      {selected && (
        <path
          d={d}
          fill="none"
          stroke="var(--theme-accent)"
          strokeWidth={coreW + 6}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.35}
        />
      )}
      {(isLive || isShort) && (
        <path
          d={d}
          fill="none"
          stroke={isShort ? 'var(--state-err-color)' : 'var(--state-on-color)'}
          strokeWidth={coreW + 7}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.55}
          filter="blur(3px)"
          className={isShort ? 'wire__pulse' : undefined}
        />
      )}
      <path
        d={d}
        fill="none"
        stroke="var(--wire-halo-dark)"
        strokeWidth={haloW}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.55}
      />
      <path
        d={d}
        fill="none"
        stroke={core}
        strokeWidth={coreW}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={isShort ? '5 5' : undefined}
      />
      {isPe && (
        <path
          d={d}
          fill="none"
          stroke="var(--wire-greenYellow-stripe)"
          strokeWidth={coreW}
          strokeDasharray="7 7"
          strokeLinejoin="round"
        />
      )}
      {isFlow && (
        <path
          d={d}
          fill="none"
          stroke="var(--state-flow-dash)"
          strokeWidth={coreW * 0.55}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2 12"
          className="wire__flow"
        />
      )}
      {onPointerDown && (
        <path
          d={d}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(12, haloW + 8)}
          strokeLinecap="round"
        />
      )}
    </g>
  );
};
