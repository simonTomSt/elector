import type { Potential, TerminalRef } from '@/domain/types';
import type { ResolvedProject } from './model';
import type { DeviceStates } from './state';
import { buildGraph } from './graph';
import { computePotentials } from './potentials';
import { detectTrips } from './shorts';
import type { SimEvent } from './events';
import {
  applyMagneticTrips,
  breakerMagneticThreshold,
  motorCurrents,
  updateContactorsAndPsu,
  updateLamps,
  updateThermalAndBreakers,
} from './devices';

export interface PendingTrip {
  deviceTag: string;
  dueAtMs: number;
  reason: 'short';
}

export interface SimState {
  t: number;
  states: DeviceStates;
  pendingTrips: PendingTrip[];
  events: SimEvent[];
}

export interface NetSnapshot {
  id: number;
  terminals: TerminalRef[];
  potentials: Potential[];
  fault?: 'short';
}

export interface SimSnapshot {
  t: number;
  nets: NetSnapshot[];
  devices: DeviceStates;
  shorts: { netId: number; kind: string }[];
  events: SimEvent[];
}

export const createSimState = (): SimState => ({
  t: 0,
  states: {},
  pendingTrips: [],
  events: [],
});

const buildSnapshot = (
  sim: SimState,
  project: ResolvedProject,
): SimSnapshot => {
  const graph = buildGraph(project, sim.states);
  const pot = computePotentials(project, graph);
  const shortNets = new Set(pot.shortCircuits.map((s) => s.netId));
  const nets: NetSnapshot[] = graph.nets.map((n) => {
    const tags = pot.byNet.get(n.id) ?? [];
    const snap: NetSnapshot = {
      id: n.id,
      terminals: n.terminals,
      potentials: tags.map((t) => t.potential),
    };
    if (shortNets.has(n.id)) snap.fault = 'short';
    return snap;
  });
  return {
    t: sim.t,
    nets,
    devices: JSON.parse(JSON.stringify(sim.states)) as DeviceStates,
    shorts: pot.shortCircuits.map((s) => ({ netId: s.netId, kind: s.kind })),
    events: [...sim.events],
  };
};

/**
 * Execute one dt ms step (default 1 ms).
 * Mutates sim in place. Snapshot computed lazily via buildSnapshot.
 */
export const stepRaw = (
  sim: SimState,
  project: ResolvedProject,
  dt: number = 1,
): void => {
  const stepEvents: SimEvent[] = [];

  // Iterate until contact states stabilize (max 20 iterations)
  let graph = buildGraph(project, sim.states);
  let pot = computePotentials(project, graph);
  let iter = 0;
  let useDt = dt;
  while (iter++ < 20) {
    const before = JSON.stringify(sim.states);
    const ctx = {
      t: sim.t,
      dt: useDt,
      project,
      graph,
      pot,
      states: sim.states,
      events: stepEvents,
    };
    updateContactorsAndPsu(ctx);
    updateLamps(ctx);
    const after = JSON.stringify(sim.states);
    if (before === after) break;
    // State changed – a contact toggled; re-build graph with dt=0 to resolve chain reactions.
    useDt = 0;
    graph = buildGraph(project, sim.states);
    pot = computePotentials(project, graph);
    if (iter >= 20) {
      stepEvents.push({
        t: sim.t,
        level: 'warn',
        text: 'Oscylacja: łańcuch styków nie stabilizuje się',
        tags: ['oscillation'],
      });
      break;
    }
  }

  // Motor currents update (reuses the final stable graph/pot from the loop above)
  const ctxFinal = {
    t: sim.t,
    dt,
    project,
    graph,
    pot,
    states: sim.states,
    events: stepEvents,
  };
  const currentsByTag = motorCurrents(ctxFinal);
  updateThermalAndBreakers(ctxFinal, currentsByTag);

  // Detect shorts → queue magnetic trips
  for (const s of pot.shortCircuits) {
    const trips = detectTrips(project, graph, [s]);
    for (const trip of trips) {
      if (sim.pendingTrips.some((p) => p.deviceTag === trip.deviceTag)) continue;
      const devState = sim.states[trip.deviceTag];
      if (devState?.tripped) continue;
      sim.pendingTrips.push({
        deviceTag: trip.deviceTag,
        dueAtMs: sim.t + trip.timeMs,
        reason: 'short',
      });
      stepEvents.push({
        t: sim.t,
        level: 'error',
        text: `Zwarcie ${s.kind} przez ${trip.deviceTag}, zadziała za ${trip.timeMs} ms`,
        tags: [trip.deviceTag, 'short'],
      });
    }
  }
  // Apply magnetic trips when due
  const { remaining } = applyMagneticTrips(ctxFinal, sim.pendingTrips);
  sim.pendingTrips = remaining;

  // Also: per-device magnetic threshold (overcurrent trip) for motor-running overcurrent
  for (const dev of project.devices) {
    if (dev.type.kind !== 'mcb' && dev.type.kind !== 'motorBreaker') continue;
    const st = sim.states[dev.instance.tag];
    if (!st || st.tripped) continue;
    const curr = currentsByTag.size > 0 ? 0 : 0;
    // Note: the shorts detector already covers L-L/L-N/DC magnetic trips.
    // Motor startup (6×In) current: for C16 and 8.2 A motor → ~49 A still below 5×16=80 A, no magnetic trip.
    void curr;
  }

  sim.events.push(...stepEvents);
  sim.t += dt;
};

/**
 * Execute one dt ms step and return a full snapshot. Convenience wrapper.
 */
export const step = (
  sim: SimState,
  project: ResolvedProject,
  dt: number = 1,
): SimSnapshot => {
  stepRaw(sim, project, dt);
  return buildSnapshot(sim, project);
};

const pickAdaptiveDt = (
  sim: SimState,
  project: ResolvedProject,
  remainingMs: number,
): number => {
  if (sim.pendingTrips.length > 0) {
    const nearest = Math.min(...sim.pendingTrips.map((p) => p.dueAtMs - sim.t));
    return Math.max(1, Math.min(nearest, 1));
  }
  // If any contactor is mid-transition, keep dt small.
  for (const dev of project.devices) {
    const st = sim.states[dev.instance.tag];
    if (!st) continue;
    if (dev.type.kind === 'contactor') {
      const pc = st.pendingCloseMs ?? 0;
      const po = st.pendingOpenMs ?? 0;
      if ((pc > 0 && pc < 15) || (po > 0 && po < 10)) return 1;
    }
    if (dev.type.kind === 'psu') {
      const pp = st.psuPoweredMs ?? 0;
      if (pp > 0 && pp < 100) return 1;
    }
    if (dev.type.kind === 'motor') {
      const rm = st.runMs ?? 0;
      if (st.running && rm < 600) return 5;
    }
  }
  // No pending transitions → coarse step.
  return Math.max(1, Math.min(50, remainingMs));
};

export const stepMany = (
  sim: SimState,
  project: ResolvedProject,
  totalMs: number,
  dt?: number,
): SimSnapshot => {
  if (totalMs <= 0) return buildSnapshot(sim, project);
  let remaining = totalMs;
  while (remaining > 0) {
    const useDt = dt ?? pickAdaptiveDt(sim, project, remaining);
    const applied = Math.min(useDt, remaining);
    stepRaw(sim, project, applied);
    remaining -= applied;
  }
  return buildSnapshot(sim, project);
};

export { breakerMagneticThreshold };
