import type { FC } from 'react';
import { buildOrthoRoute, type PointMm } from '@/domain/routing';
import type { WireColor, WireCrossSection } from '@/domain/types';
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

const strokeWidthFor = (cs: WireCrossSection): number => {
  if (cs <= 0.75) return tokens.wire.width.core * 0.85;
  if (cs <= 1.5) return tokens.wire.width.core;
  if (cs <= 2.5) return tokens.wire.width.core * 1.2;
  return tokens.wire.width.core * 1.4;
};

interface Props {
  origin: PointMm;
  bends: readonly PointMm[];
  cursor: PointMm;
  color: WireColor;
  cs: WireCrossSection;
  valid: boolean;
}

export const DraftWireView: FC<Props> = ({ origin, bends, cursor, color, cs, valid }) => {
  const route = buildOrthoRoute(origin, bends, cursor);
  const d = roundedOrthogonalPath(route);
  const core = valid ? WIRE_CSS_VAR[color] : 'var(--state-err-color)';
  const coreW = strokeWidthFor(cs);
  return (
    <g data-draft="wire" pointerEvents="none">
      <path
        d={d}
        fill="none"
        stroke={core}
        strokeWidth={coreW}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="6 4"
        opacity={0.9}
      />
      {bends.map((p, i) => (
        <circle
          key={`bend-${i}`}
          cx={mmToPx(p.xMm)}
          cy={mmToPx(p.yMm)}
          r={3}
          fill="var(--theme-accent)"
        />
      ))}
      <circle
        cx={mmToPx(origin.xMm)}
        cy={mmToPx(origin.yMm)}
        r={4}
        fill="none"
        stroke="var(--theme-accent)"
        strokeWidth={1.5}
      />
    </g>
  );
};
