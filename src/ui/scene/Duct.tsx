import type { FC } from 'react';
import type { Duct as DuctData } from '@/domain/types';
import { mmToPx } from './layout';

interface Props {
  duct: DuctData;
}

export const Duct: FC<Props> = ({ duct }) => {
  const x = mmToPx(duct.xMm);
  const y = mmToPx(duct.yMm);
  const w = mmToPx(duct.wMm);
  const h = mmToPx(duct.hMm);
  const isHorizontal = w >= h;
  const combH = 3;
  const combInset = 3;

  return (
    <g data-duct>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="var(--scene-duct)"
        stroke="var(--scene-ductEdge)"
      />
      {isHorizontal ? (
        <>
          <rect
            x={x + combInset * 2}
            y={y}
            width={Math.max(0, w - combInset * 4)}
            height={combH}
            fill="url(#scene-duct-h)"
          />
          <rect
            x={x + combInset * 2}
            y={y + h - combH}
            width={Math.max(0, w - combInset * 4)}
            height={combH}
            fill="url(#scene-duct-h)"
          />
        </>
      ) : (
        <>
          <rect
            x={x}
            y={y + combInset * 2}
            width={combH}
            height={Math.max(0, h - combInset * 4)}
            fill="url(#scene-duct-v)"
          />
          <rect
            x={x + w - combH}
            y={y + combInset * 2}
            width={combH}
            height={Math.max(0, h - combInset * 4)}
            fill="url(#scene-duct-v)"
          />
        </>
      )}
    </g>
  );
};
