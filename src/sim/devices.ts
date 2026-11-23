import type { ResolvedDevice, ResolvedProject } from './model';
import type { DeviceRuntimeState, DeviceStates } from './state';
import { defaultStateFor } from './state';
import type { Graph } from './graph';
import type { Potentials } from './potentials';
import { evaluateLoads, motorFaseCount, type EnergizedLoad } from './loads';
import { buildAdjacency, traceMotorPath } from './paths';
import type { SimEvent } from './events';

export interface DeviceTickContext {
  t: number;
  dt: number;
  project: ResolvedProject;
  graph: Graph;
  pot: Potentials;
  states: DeviceStates;
  events: SimEvent[];
  energizedLoads?: EnergizedLoad[];
}

const getNum = (dev: ResolvedDevice, key: string, fallback: number): number => {
  const over = dev.instance.params?.[key];
  if (typeof over === 'number') return over;
  const base = dev.type.params?.[key];
  if (typeof base === 'number') return base;
  return fallback;
};

const getStr = (dev: ResolvedDevice, key: string, fallback: string): string => {
  const over = dev.instance.params?.[key];
  if (typeof over === 'string') return over;
  const base = dev.type.params?.[key];
  if (typeof base === 'string') return base;
  return fallback;
};

const ensureState = (dev: ResolvedDevice, states: DeviceStates): DeviceRuntimeState => {
  const existing = states[dev.instance.tag];
  if (existing) return existing;
  const fresh = defaultStateFor(dev.type.kind);
  states[dev.instance.tag] = fresh;
  return fresh;
};

/**
 * Compute motor current, per-overload heat accumulation, and per-mcb overload current.
 * Must run after device state updates (closed/running flags) but reads graph/pot from this tick.
 */
export const motorCurrents = (ctx: DeviceTickContext): Map<string, number> => {
  const perMotor = new Map<string, number>();
  for (const dev of ctx.project.devices) {
    if (dev.type.kind !== 'motor') continue;
    const st = ensureState(dev, ctx.states);
    const nPhases = motorFaseCount(dev, ctx.graph, ctx.pot);
    const In = getNum(dev, 'In', 8.2);
    const startRatio = getNum(dev, 'startRatio', 6);
    const startMs = getNum(dev, 'startMs', 600);
    const loadRel = typeof st.load === 'number' ? st.load : getNum(dev, 'load', 0.95);
    let current = 0;
    let rpm = st.rpm ?? 0;
    const nN = getNum(dev, 'nN', 1440);
    if (nPhases === 3) {
      const runMs = typeof st.runMs === 'number' ? st.runMs : 0;
      const nextRunMs = runMs + ctx.dt;
      if (runMs < startMs) {
        current = startRatio * In;
        rpm = Math.min(nN, (nextRunMs / startMs) * nN);
      } else {
        current = In * loadRel;
        rpm = nN;
      }
      st.runMs = nextRunMs;
      st.running = true;
    } else if (nPhases === 2) {
      // Two-phase operation: overload ×1.7, no startup, rpm decays
      current = In * loadRel * 1.7;
      rpm = Math.max(0, rpm - (nN / 2000) * ctx.dt);
      st.runMs = 0;
      st.running = false;
    } else {
      current = 0;
      rpm = Math.max(0, rpm - (nN / 500) * ctx.dt);
      st.runMs = 0;
      st.running = false;
    }
    st.rpm = rpm;
    st.current = current;
    perMotor.set(dev.instance.tag, current);
  }
  return perMotor;
};

export const updateContactorsAndPsu = (ctx: DeviceTickContext): void => {
  const energized = ctx.energizedLoads ?? evaluateLoads(ctx.project, ctx.graph, ctx.pot);
  ctx.energizedLoads = energized;
  const coilEnergized = new Map<string, boolean>();
  const psuEnergized = new Map<string, boolean>();
  for (const l of energized) {
    if (l.kind === 'coilDC' || l.kind === 'coilAC') coilEnergized.set(l.deviceTag, true);
    if (l.kind === 'psuIn') psuEnergized.set(l.deviceTag, true);
  }

  for (const dev of ctx.project.devices) {
    const st = ensureState(dev, ctx.states);
    if (dev.type.kind === 'contactor') {
      const powered = coilEnergized.get(dev.instance.tag) === true && !st.coilOpen;
      st.coil = powered;
      const closeMs = getNum(dev, 'closeMs', 15);
      const openMs = getNum(dev, 'openMs', 10);
      if (powered) {
        const pendingCloseMs = typeof st.pendingCloseMs === 'number' ? st.pendingCloseMs : 0;
        st.pendingOpenMs = 0;
        if (!st.closed) {
          const next = pendingCloseMs + ctx.dt;
          if (next >= closeMs) {
            st.closed = true;
            st.pendingCloseMs = 0;
            ctx.events.push({
              t: ctx.t,
              level: 'info',
              text: `${dev.instance.tag} zamknięty`,
              tags: [dev.instance.tag, 'contactor'],
            });
          } else {
            st.pendingCloseMs = next;
          }
        }
      } else {
        const pendingOpenMs = typeof st.pendingOpenMs === 'number' ? st.pendingOpenMs : 0;
        st.pendingCloseMs = 0;
        if (st.closed && !st.manual) {
          const next = pendingOpenMs + ctx.dt;
          if (next >= openMs) {
            st.closed = false;
            st.pendingOpenMs = 0;
            ctx.events.push({
              t: ctx.t,
              level: 'info',
              text: `${dev.instance.tag} otwarty`,
              tags: [dev.instance.tag, 'contactor'],
            });
          } else {
            st.pendingOpenMs = next;
          }
        }
      }
    } else if (dev.type.kind === 'psu') {
      const powered = psuEnergized.get(dev.instance.tag) === true;
      const delay = getNum(dev, 'startDelayMs', 100);
      if (powered) {
        const acc = typeof st.psuPoweredMs === 'number' ? st.psuPoweredMs : 0;
        const next = acc + ctx.dt;
        st.psuPoweredMs = next;
        if (!st.out && next >= delay) {
          st.out = true;
          ctx.events.push({
            t: ctx.t,
            level: 'info',
            text: `${dev.instance.tag} zasilanie 24 V DC aktywne`,
            tags: [dev.instance.tag, 'psu'],
          });
        }
      } else {
        st.psuPoweredMs = 0;
        if (st.out) {
          st.out = false;
          ctx.events.push({
            t: ctx.t,
            level: 'info',
            text: `${dev.instance.tag} zanik napięcia DC`,
            tags: [dev.instance.tag, 'psu'],
          });
        }
      }
    } else if (dev.type.kind === 'timer') {
      const powered = coilEnergized.get(dev.instance.tag) === true;
      st.coil = powered;
      const tSet = getNum(dev, 'tSetMs', 3000);
      if (powered) {
        const acc = typeof st.elapsed === 'number' ? st.elapsed : 0;
        const next = acc + ctx.dt;
        st.elapsed = next;
        if (!st.out && next >= tSet) {
          st.out = true;
          st.closed = true;
          ctx.events.push({
            t: ctx.t,
            level: 'info',
            text: `${dev.instance.tag} TON – wyjście załączone (${Math.round(next)} ms)`,
            tags: [dev.instance.tag, 'timer'],
          });
        }
      } else {
        st.elapsed = 0;
        st.out = false;
        st.closed = false;
      }
    }
  }
};

export const updateLamps = (ctx: DeviceTickContext): void => {
  const energized = ctx.energizedLoads ?? evaluateLoads(ctx.project, ctx.graph, ctx.pot);
  ctx.energizedLoads = energized;
  const litTags = new Set<string>();
  for (const l of energized) if (l.kind === 'lamp') litTags.add(l.deviceTag);
  for (const dev of ctx.project.devices) {
    if (dev.type.kind !== 'lamp') continue;
    const st = ensureState(dev, ctx.states);
    st.lit = litTags.has(dev.instance.tag);
  }
};

const updateOverload = (
  dev: ResolvedDevice,
  current: number,
  ctx: DeviceTickContext,
): void => {
  const st = ensureState(dev, ctx.states);
  const Iset = getNum(dev, 'set', 8.5);
  // Klasa 10A: 7.2×Iset wyzwala w 4–10 s → wybieramy τ ≈ 150 s · ((7.2)²−1) ≈ typowo ~6.5 s przy 7.2× Iset
  // heat += dt_s · ((I/Iset)² − 1) / τ_s, wyzwolenie przy heat ≥ 1
  // dobór τ: chcemy t ≈ 6 s przy I = 7.2×Iset → t = τ/((I/Iset)²−1) ⇒ τ ≈ 6 · (51.84−1) = 305 s
  // dla I = 1.3×Iset: t = 305/(1.69−1) ≈ 442 s (ok, klasa 10A: 1.2×Iset nigdy, 1.5×Iset <2 min)
  // koryguję: dla klasy 10 chcemy t ≈ 10 s przy I = 7.2×Iset → τ ≈ 10·50.84 ≈ 508 s
  // kompromis: 10 s przy 7.2×, ale wtedy 1.3× daje ~735 s ≈ 12 min – za długo.
  // W praktyce krzywa IEC 60947-4: dla 2×Iset w stanie zimnym ~80 s. Model uproszczony:
  // Uproszczona krzywa klasy 10A (dydaktyka): τ dobrane tak, by 1.25×Iset trip ~100 s,
  // a 7.2×Iset trip ~1.2 s (szybciej niż norma 4-10 s, ale wystarczające dla symulacji).
  const tauS = 60;
  const tauCoolS = 120;
  const heat = typeof st.heat === 'number' ? st.heat : 0;
  const dts = ctx.dt / 1000;
  let newHeat = heat;
  if (current > Iset * 1.05) {
    const ratio = current / Iset;
    newHeat = heat + (dts * (ratio * ratio - 1)) / tauS;
  } else {
    newHeat = Math.max(0, heat - dts / tauCoolS);
  }
  st.heat = newHeat;
  if (!st.tripped && newHeat >= 1) {
    st.tripped = true;
    ctx.events.push({
      t: ctx.t,
      level: 'warn',
      text: `${dev.instance.tag} zadziałał (przeciążenie, I=${current.toFixed(1)} A)`,
      tags: [dev.instance.tag, 'overload', 'trip'],
    });
  }
};

const updateBreakerOverload = (
  dev: ResolvedDevice,
  current: number,
  ctx: DeviceTickContext,
): void => {
  const st = ensureState(dev, ctx.states);
  if (st.tripped) return;
  const In = getNum(dev, 'In', getNum(dev, 'set', 16));
  if (current > In * 1.13) {
    const ratio = current / In;
    const tTripS = 40 / (ratio * ratio - 1);
    const acc = typeof st.overloadMs === 'number' ? st.overloadMs : 0;
    const next = acc + ctx.dt;
    st.overloadMs = next;
    if (next / 1000 >= tTripS) {
      st.tripped = true;
      st.overloadMs = 0;
      ctx.events.push({
        t: ctx.t,
        level: 'warn',
        text: `${dev.instance.tag} zadziałał (przeciążenie, I=${current.toFixed(1)} A)`,
        tags: [dev.instance.tag, 'mcb', 'trip'],
      });
    }
  } else {
    st.overloadMs = 0;
  }
};

export const updateThermalAndBreakers = (
  ctx: DeviceTickContext,
  motorCurrentsByTag: ReadonlyMap<string, number>,
): void => {
  // For each motor, trace which overloads and breakers carry its current.
  const overloadCurrents = new Map<string, number>();
  const breakerCurrents = new Map<string, number>();
  const adj = motorCurrentsByTag.size > 0 ? buildAdjacency(ctx.graph) : undefined;
  for (const [motorTag, current] of motorCurrentsByTag) {
    if (current <= 0) continue;
    const motor = ctx.project.byTag.get(motorTag);
    if (!motor) continue;
    for (const termId of ['U1', 'V1', 'W1']) {
      const trace = traceMotorPath(ctx.project, ctx.graph, `${motorTag}:${termId}`, adj);
      for (const ol of trace.overloadTags) {
        overloadCurrents.set(ol, Math.max(overloadCurrents.get(ol) ?? 0, current));
      }
      for (const bk of trace.breakerTags) {
        breakerCurrents.set(bk, Math.max(breakerCurrents.get(bk) ?? 0, current));
      }
    }
  }

  for (const dev of ctx.project.devices) {
    if (dev.type.kind === 'overload') {
      updateOverload(dev, overloadCurrents.get(dev.instance.tag) ?? 0, ctx);
    } else if (dev.type.kind === 'mcb' || dev.type.kind === 'motorBreaker') {
      updateBreakerOverload(dev, breakerCurrents.get(dev.instance.tag) ?? 0, ctx);
    }
  }
};

export const applyMagneticTrips = <T extends { deviceTag: string; dueAtMs: number }>(
  ctx: DeviceTickContext,
  pendingTrips: T[],
): { done: { deviceTag: string }[]; remaining: T[] } => {
  const done: { deviceTag: string }[] = [];
  const remaining: T[] = [];
  for (const pt of pendingTrips) {
    if (ctx.t >= pt.dueAtMs) {
      const st = ensureState(ctx.project.byTag.get(pt.deviceTag)!, ctx.states);
      if (!st.tripped) {
        st.tripped = true;
        ctx.events.push({
          t: ctx.t,
          level: 'error',
          text: `${pt.deviceTag} wyzwolony (zwarcie)`,
          tags: [pt.deviceTag, 'short', 'trip'],
        });
      }
      done.push({ deviceTag: pt.deviceTag });
    } else {
      remaining.push(pt);
    }
  }
  return { done, remaining };
};

// Discriminate 'curve' param (B/C) and change short trip threshold.
export const breakerMagneticThreshold = (dev: ResolvedDevice): number => {
  const In = getNum(dev, 'In', getNum(dev, 'set', 16));
  const curve = getStr(dev, 'curve', 'C').toUpperCase();
  const mult = curve === 'B' ? 3 : 5;
  return In * mult;
};
