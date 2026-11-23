import { tokens } from '@/ui/theme/tokens';
import { mmToPx } from './layout';

const CORNER_R_PX = tokens.wire.cornerRadius;

export const roundedOrthogonalPath = (ptsMm: readonly [number, number][]): string => {
  if (ptsMm.length === 0) return '';
  const pts = ptsMm.map(([x, y]) => [mmToPx(x), mmToPx(y)] as const);
  if (pts.length === 1) {
    const p = pts[0];
    if (!p) return '';
    return `M${p[0]} ${p[1]}`;
  }
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return '';
  let d = `M${first[0]} ${first[1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    if (!p0 || !p1 || !p2) continue;
    const d1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
    const d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1;
    const rr = Math.min(CORNER_R_PX, d1 / 2, d2 / 2);
    const ax = p1[0] + ((p0[0] - p1[0]) / d1) * rr;
    const ay = p1[1] + ((p0[1] - p1[1]) / d1) * rr;
    const bx = p1[0] + ((p2[0] - p1[0]) / d2) * rr;
    const by = p1[1] + ((p2[1] - p1[1]) / d2) * rr;
    d += ` L${ax.toFixed(1)} ${ay.toFixed(1)} Q${p1[0]} ${p1[1]} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  d += ` L${last[0]} ${last[1]}`;
  return d;
};
