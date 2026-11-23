import type { FC } from 'react';
import type { ResolvedDevice } from '@/sim/model';
import { mmToPx, PLATE } from './layout';

interface Props {
  devices: readonly ResolvedDevice[];
  stripHeightMm: number;
}

const kindLabel = (rd: ResolvedDevice): string => {
  switch (rd.type.kind) {
    case 'pushbutton':
      return String(rd.type.params['legend'] ?? '');
    case 'lamp':
      return 'H';
    case 'motor':
      return 'M';
    case 'supply':
      return '~';
    default:
      return '';
  }
};

const kindColor = (rd: ResolvedDevice): string => {
  const base = rd.type.params['color'];
  if (typeof base === 'string') {
    if (base === 'red') return '#F0564F';
    if (base === 'green') return '#3FCF8E';
  }
  if (rd.type.kind === 'motor' || rd.type.kind === 'supply') return 'var(--scene-dev)';
  return 'var(--scene-devShade)';
};

export const DoorStrip: FC<Props> = ({ devices, stripHeightMm }) => {
  const plateHPx = mmToPx(PLATE.hMm);
  const stripHPx = mmToPx(stripHeightMm);
  const plateWPx = mmToPx(PLATE.wMm);
  if (devices.length === 0) return null;

  const slotW = Math.min(mmToPx(50), plateWPx / Math.max(devices.length, 1) - 12);
  const gap = (plateWPx - slotW * devices.length) / (devices.length + 1);
  const cy = plateHPx + stripHPx / 2;

  return (
    <g data-door-strip>
      <text
        x={10}
        y={plateHPx + 14}
        fontSize={9}
        fontFamily="var(--font-mono)"
        fill="var(--scene-label)"
      >
        Drzwi / zewnętrzne
      </text>
      {devices.map((rd, idx) => {
        const x = gap + idx * (slotW + gap);
        return (
          <g key={rd.instance.tag} data-tag={rd.instance.tag} data-kind={rd.type.kind}>
            <rect
              x={x}
              y={cy - stripHPx * 0.3}
              width={slotW}
              height={stripHPx * 0.6}
              rx={6}
              fill={kindColor(rd)}
              stroke="var(--scene-devEdge)"
            />
            <text
              x={x + slotW / 2}
              y={cy - 2}
              textAnchor="middle"
              fontSize={11}
              fontFamily="var(--font-mono)"
              fontWeight={600}
              fill="var(--scene-ink)"
            >
              {rd.instance.tag}
            </text>
            <text
              x={x + slotW / 2}
              y={cy + 12}
              textAnchor="middle"
              fontSize={9}
              fontFamily="var(--font-mono)"
              fill="var(--scene-ink2)"
            >
              {kindLabel(rd)}
            </text>
          </g>
        );
      })}
    </g>
  );
};
