import type { RailIndex } from '@/store/project';
import type { RailGeom } from './layout';

export const svgPointToMm = (
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  pxPerMm: number,
): { xMm: number; yMm: number } | null => {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const inv = ctm.inverse();
  const local = pt.matrixTransform(inv);
  return { xMm: local.x / pxPerMm, yMm: local.y / pxPerMm };
};

const RAIL_BAND_MM = 25;

export const pickRailForY = (
  yMm: number,
  rails: ReadonlyMap<RailIndex, RailGeom>,
): RailIndex | null => {
  let best: { idx: RailIndex; dist: number } | null = null;
  for (const [idx, geom] of rails) {
    const dist = Math.abs(yMm - geom.yCenterMm);
    if (dist <= RAIL_BAND_MM && (!best || dist < best.dist)) {
      best = { idx, dist };
    }
  }
  return best?.idx ?? null;
};
