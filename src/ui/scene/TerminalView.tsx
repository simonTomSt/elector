import type { FC } from 'react';
import { mmToPx, type TerminalGeom } from './layout';
import { isSemanticZoom, useSceneZoom } from './zoomContext';

interface Props {
  term: TerminalGeom;
  showLabel?: boolean;
}

export const TerminalView: FC<Props> = ({ term, showLabel = true }) => {
  const cx = mmToPx(term.xMm);
  const cy = mmToPx(term.yMm);
  const ly = mmToPx(term.labelYMm);
  const zoom = useSceneZoom();
  const semantic = isSemanticZoom(zoom);
  const labelVisible = showLabel && term.id && semantic;
  return (
    <g data-terminal={term.id} data-semantic={semantic ? '1' : '0'}>
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
    </g>
  );
};
