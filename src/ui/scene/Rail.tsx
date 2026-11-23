import type { FC } from 'react';
import { mmToPx, type RailGeom } from './layout';

interface Props {
  geom: RailGeom;
  xStartMm: number;
  lengthMm: number;
}

export const Rail: FC<Props> = ({ geom, xStartMm, lengthMm }) => {
  const x = mmToPx(xStartMm);
  const y = mmToPx(geom.yTopMm);
  const w = mmToPx(lengthMm);
  const h = mmToPx(geom.yBotMm - geom.yTopMm);
  return (
    <g data-rail={geom.index}>
      <rect x={x} y={y} width={w} height={h} fill="var(--scene-rail)" />
      <rect x={x} y={y} width={w} height={h} fill="url(#scene-rail)" />
      <text
        x={x + w - 4}
        y={y - 3}
        textAnchor="end"
        fontSize={9}
        fill="var(--scene-label)"
        fontFamily="var(--font-mono)"
      >
        TH35 · szyna {geom.index}
      </text>
    </g>
  );
};
