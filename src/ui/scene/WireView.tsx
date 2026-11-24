import type { FC, PointerEvent as ReactPointerEvent } from 'react';
import type { Wire, WireColor, WireFault } from '@/domain/types';
import { tokens } from '@/ui/theme/tokens';
import { mmToPx } from './layout';
import { roundedOrthogonalPath } from './routing';

/** Punkt na trasie wybrany jako najbardziej "środkowy" — do oznaczenia faultu. */
const midpointOfRoute = (route: readonly [number, number][]): { x: number; y: number } | null => {
  if (route.length < 2) return null;
  const segs: { a: [number, number]; b: [number, number]; len: number }[] = [];
  let total = 0;
  for (let i = 0; i < route.length - 1; i += 1) {
    const a = route[i]!;
    const b = route[i + 1]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    segs.push({ a, b, len });
    total += len;
  }
  if (total === 0) {
    const a = route[0]!;
    return { x: mmToPx(a[0]), y: mmToPx(a[1]) };
  }
  let target = total / 2;
  for (const s of segs) {
    if (target <= s.len) {
      const t = s.len === 0 ? 0 : target / s.len;
      return {
        x: mmToPx(s.a[0] + (s.b[0] - s.a[0]) * t),
        y: mmToPx(s.a[1] + (s.b[1] - s.a[1]) * t),
      };
    }
    target -= s.len;
  }
  const last = segs[segs.length - 1]!;
  return { x: mmToPx(last.b[0]), y: mmToPx(last.b[1]) };
};

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
      {wire.fault && wire.route && (
        <FaultMarker
          fault={wire.fault}
          point={midpointOfRoute(wire.route)}
          wireId={wire.id}
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

interface FaultMarkerProps {
  fault: WireFault;
  point: { x: number; y: number } | null;
  wireId: string;
}

const FaultMarker: FC<FaultMarkerProps> = ({ fault, point, wireId }) => {
  if (!point) return null;
  const label = fault === 'open' ? 'przerwa' : 'luźny';
  if (fault === 'open') {
    const r = 9;
    return (
      <g
        data-fault="open"
        data-wire-fault={wireId}
        aria-label={`Przewód ${wireId}: ${label}`}
      >
        <circle
          cx={point.x}
          cy={point.y}
          r={r}
          fill="var(--state-err-color)"
          opacity={0.18}
        />
        <circle
          cx={point.x}
          cy={point.y}
          r={r - 2}
          fill="none"
          stroke="var(--state-err-color)"
          strokeWidth={1.5}
        />
        <path
          d={`M${point.x - 5} ${point.y - 5} L${point.x + 5} ${point.y + 5} M${point.x + 5} ${point.y - 5} L${point.x - 5} ${point.y + 5}`}
          stroke="var(--state-err-color)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </g>
    );
  }
  // loose
  const r = 9;
  return (
    <g
      data-fault="loose"
      data-wire-fault={wireId}
      aria-label={`Przewód ${wireId}: ${label}`}
    >
      <circle
        cx={point.x}
        cy={point.y}
        r={r}
        fill="var(--state-warn-color, #E6A23C)"
        opacity={0.18}
      />
      <circle
        cx={point.x}
        cy={point.y}
        r={r - 2}
        fill="none"
        stroke="var(--state-warn-color, #E6A23C)"
        strokeWidth={1.5}
        strokeDasharray="3 2"
      />
      <text
        x={point.x}
        y={point.y + 3}
        textAnchor="middle"
        fontSize={9}
        fontWeight={700}
        fill="var(--state-warn-color, #E6A23C)"
      >
        !
      </text>
    </g>
  );
};
