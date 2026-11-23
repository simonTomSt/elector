import type { FC, PointerEvent as ReactPointerEvent } from 'react';
import { mmToPx, type TerminalGeom } from './layout';
import { isSemanticZoom, useSceneZoom } from './zoomContext';

type Highlight = 'none' | 'source' | 'target' | 'reject';

interface Props {
  term: TerminalGeom;
  terminalRef?: string | undefined;
  showLabel?: boolean;
  highlight?: Highlight;
  onPointerDown?: ((ref: string, e: ReactPointerEvent<SVGGElement>) => void) | undefined;
}

const HALO_BY: Record<Highlight, { stroke: string; r: number } | null> = {
  none: null,
  source: { stroke: 'var(--theme-accent)', r: 10 },
  target: { stroke: 'var(--theme-accent)', r: 10 },
  reject: { stroke: 'var(--state-err-color)', r: 10 },
};

export const TerminalView: FC<Props> = ({
  term,
  terminalRef,
  showLabel = true,
  highlight = 'none',
  onPointerDown,
}) => {
  const cx = mmToPx(term.xMm);
  const cy = mmToPx(term.yMm);
  const ly = mmToPx(term.labelYMm);
  const zoom = useSceneZoom();
  const semantic = isSemanticZoom(zoom);
  const labelVisible = showLabel && term.id && semantic;
  const halo = HALO_BY[highlight];
  const interactive = Boolean(terminalRef && onPointerDown);
  return (
    <g
      data-terminal={term.id}
      data-terminal-ref={terminalRef}
      data-semantic={semantic ? '1' : '0'}
      data-highlight={highlight}
      style={interactive ? { cursor: 'crosshair' } : undefined}
    >
      {halo && (
        <circle
          cx={cx}
          cy={cy}
          r={halo.r}
          fill="none"
          stroke={halo.stroke}
          strokeWidth={2}
          opacity={0.85}
          pointerEvents="none"
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={5.2}
        fill="var(--scene-term)"
        stroke="var(--scene-termEdge)"
        strokeWidth={1}
      />
      <path
        d={`M${cx - 3} ${cy + 3} L${cx + 3} ${cy - 3}`}
        stroke="var(--scene-termEdge)"
        strokeWidth={1.2}
      />
      {semantic && (
        <path
          d={`M${cx + 3} ${cy + 3} L${cx - 3} ${cy - 3}`}
          stroke="var(--scene-termEdge)"
          strokeWidth={1.2}
        />
      )}
      {labelVisible && (
        <text
          x={cx}
          y={ly}
          textAnchor="middle"
          fontSize={7}
          fontFamily="var(--font-mono)"
          fill="var(--scene-ink2)"
        >
          {term.id}
        </text>
      )}
      {interactive && (
        <circle
          cx={cx}
          cy={cy}
          r={11}
          fill="transparent"
          onPointerDown={(e) => onPointerDown!(terminalRef!, e)}
        />
      )}
    </g>
  );
};
