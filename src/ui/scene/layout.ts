import type { DeviceInstance, DeviceType, Rail, Terminal } from '@/domain/types';
import type { ResolvedDevice } from '@/sim/model';
import { tokens } from '@/ui/theme/tokens';

export const PX_PER_MM = tokens.scene.scalePxPerMm;

export const mmToPx = (mm: number): number => mm * PX_PER_MM;

export const PLATE = { wMm: 500, hMm: 320 } as const;

export const RAIL_HEIGHT_MM = 35;

const DEVICE_ENVELOPE = {
  1: { topOffMm: 38.75, botOffMm: 47.25, termTopOffMm: 30.75, termBotOffMm: 38.75 },
  2: { topOffMm: 35, botOffMm: 34, termTopOffMm: 27.25, termBotOffMm: 26 },
} as const;

type RailIndex = 1 | 2;

interface RailPos {
  rail: RailIndex;
  xMm: number;
}

const railPlacement = (d: DeviceInstance): RailPos | null => {
  const raw = d as unknown as { rail?: unknown; xMm?: unknown };
  const r = raw.rail;
  const x = raw.xMm;
  if ((r === 1 || r === 2) && typeof x === 'number') {
    return { rail: r, xMm: x };
  }
  return null;
};

export const isRailMounted = (d: DeviceInstance): boolean => railPlacement(d) !== null;

export interface RailGeom {
  index: RailIndex;
  yTopMm: number;
  yBotMm: number;
  yCenterMm: number;
  deviceTopMm: number;
  deviceBotMm: number;
  termTopMm: number;
  termBotMm: number;
}

export const buildRailGeom = (railIdx: RailIndex, rail: Rail): RailGeom => {
  const env = DEVICE_ENVELOPE[railIdx];
  const yCenterMm = rail.yMm;
  const yTopMm = yCenterMm - RAIL_HEIGHT_MM / 2;
  const yBotMm = yCenterMm + RAIL_HEIGHT_MM / 2;
  return {
    index: railIdx,
    yCenterMm,
    yTopMm,
    yBotMm,
    deviceTopMm: yCenterMm - env.topOffMm,
    deviceBotMm: yCenterMm + env.botOffMm,
    termTopMm: yCenterMm - env.termTopOffMm,
    termBotMm: yCenterMm + env.termBotOffMm,
  };
};

export interface DeviceBox {
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
  rail: RailGeom;
}

export const deviceBox = (
  rd: ResolvedDevice,
  rails: ReadonlyMap<RailIndex, RailGeom>,
): DeviceBox | null => {
  const p = railPlacement(rd.instance);
  if (!p) return null;
  const rail = rails.get(p.rail);
  if (!rail) return null;
  return {
    xMm: p.xMm,
    yMm: rail.deviceTopMm,
    wMm: rd.type.widthMm,
    hMm: rail.deviceBotMm - rail.deviceTopMm,
    rail,
  };
};

export interface TerminalGeom {
  id: string;
  side: 'top' | 'bottom' | 'front';
  xMm: number;
  yMm: number;
  labelYMm: number;
}

const effectiveSide = (type: DeviceType, t: Terminal): 'top' | 'bottom' | 'front' => {
  if (t.side) return t.side;
  if (type.kind === 'peBar') return 'front';
  return 'top';
};

export const terminalsForDevice = (
  rd: ResolvedDevice,
  box: DeviceBox,
): TerminalGeom[] => {
  const result: TerminalGeom[] = [];
  const peBarPitch = box.wMm / (rd.type.terminals.length + 1);
  rd.type.terminals.forEach((t, idx) => {
    const side = effectiveSide(rd.type, t);
    const offsetX = t.x ?? (rd.type.kind === 'peBar' ? peBarPitch * (idx + 1) : box.wMm / 2);
    const xMm = box.xMm + offsetX;
    let yMm: number;
    let labelYMm: number;
    if (side === 'top') {
      yMm = box.rail.termTopMm;
      labelYMm = yMm - 4.5;
    } else if (side === 'bottom') {
      yMm = box.rail.termBotMm;
      labelYMm = yMm + 7.5;
    } else {
      yMm = box.yMm + box.hMm / 2;
      labelYMm = yMm + 7.5;
    }
    result.push({ id: t.id, side, xMm, yMm, labelYMm });
  });
  return result;
};

export const terminalPositionIndex = (
  resolvedDevices: readonly ResolvedDevice[],
  rails: ReadonlyMap<RailIndex, RailGeom>,
): ReadonlyMap<string, { xMm: number; yMm: number }> => {
  const idx = new Map<string, { xMm: number; yMm: number }>();
  for (const rd of resolvedDevices) {
    const box = deviceBox(rd, rails);
    if (!box) continue;
    const terms = terminalsForDevice(rd, box);
    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];
      const ref = rd.terminalRefs[i];
      if (!term || !ref) continue;
      idx.set(ref, { xMm: term.xMm, yMm: term.yMm });
    }
  }
  return idx;
};
