export interface PointMm {
  xMm: number;
  yMm: number;
}

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;

const pushPoint = (out: [number, number][], x: number, y: number): void => {
  const last = out[out.length - 1];
  if (last && near(last[0], x) && near(last[1], y)) return;
  out.push([x, y]);
};

const orthoBetween = (
  out: [number, number][],
  a: PointMm,
  b: PointMm,
  axisFirst: 'h' | 'v',
): void => {
  if (near(a.xMm, b.xMm) && near(a.yMm, b.yMm)) return;
  if (near(a.xMm, b.xMm) || near(a.yMm, b.yMm)) {
    pushPoint(out, b.xMm, b.yMm);
    return;
  }
  if (axisFirst === 'h') {
    pushPoint(out, b.xMm, a.yMm);
  } else {
    pushPoint(out, a.xMm, b.yMm);
  }
  pushPoint(out, b.xMm, b.yMm);
};

export const buildOrthoRoute = (
  start: PointMm,
  bends: readonly PointMm[],
  end: PointMm,
  axisFirst: 'h' | 'v' = 'h',
): [number, number][] => {
  const out: [number, number][] = [];
  pushPoint(out, start.xMm, start.yMm);
  let prev: PointMm = start;
  let axis = axisFirst;
  for (const b of bends) {
    orthoBetween(out, prev, b, axis);
    prev = b;
    axis = axis === 'h' ? 'v' : 'h';
  }
  orthoBetween(out, prev, end, axis);
  return out;
};
