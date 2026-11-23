import type { FC } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Props {
  points: readonly Point[];
  color?: string;
  width?: number;
}

const toPath = (pts: readonly Point[]): string => {
  if (pts.length === 0) return '';
  const [first, ...rest] = pts;
  let d = `M ${first!.x} ${first!.y}`;
  for (const p of rest) d += ` L ${p.x} ${p.y}`;
  return d;
};

export const ConnectionView: FC<Props> = ({ points, color, width = 1.6 }) => (
  <path
    d={toPath(points)}
    fill="none"
    stroke={color ?? 'var(--schematic-theme-ink)'}
    strokeWidth={width}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);
