import { create } from 'zustand';
import type { ResolvedProject } from '@/sim/model';
import type { SimEvent } from '@/sim/events';
import {
  createSimState,
  stepMany,
  type SimSnapshot,
  type SimState,
} from '@/sim/step';
import { buildGraph, type Edge } from '@/sim/graph';
import { computePotentials, type PotentialTag } from '@/sim/potentials';
import { buildAdjacency } from '@/sim/paths';
import type { TerminalRef } from '@/domain/types';

export type SimSpeed = 0.01 | 0.1 | 1;
export const SPEEDS: readonly SimSpeed[] = [0.01, 0.1, 1] as const;

export interface WireRuntime {
  live: boolean;
  flow: boolean;
  short: boolean;
}

export interface SimView {
  t: number;
  devices: SimSnapshot['devices'];
  wires: Record<string, WireRuntime>;
  shorts: SimSnapshot['shorts'];
  events: SimEvent[];
}

const EMPTY_VIEW: SimView = { t: 0, devices: {}, wires: {}, shorts: [], events: [] };

interface SimStoreState {
  on: boolean;
  running: boolean;
  speed: SimSpeed;
  view: SimView;
  // Internal mutable sim state (not for equality – replaced via actions)
  _sim: SimState | null;
  _project: ResolvedProject | null;
  _lastWallMs: number | null;
  attachProject(project: ResolvedProject): void;
  turnOn(
    project: ResolvedProject,
    initialStates?: Record<string, Record<string, unknown>>,
  ): void;
  turnOff(): void;
  togglePlay(): void;
  setSpeed(s: SimSpeed): void;
  stepOnce(ms?: number): void;
  tick(wallNowMs: number): void;
  setDeviceState(tag: string, patch: Record<string, unknown>): void;
  pressButton(tag: string, pressed: boolean): void;
  setLock(tag: string, locked: boolean): void;
}

const buildWireRuntime = (
  project: ResolvedProject,
  snap: SimSnapshot,
): Record<string, WireRuntime> => {
  const out: Record<string, WireRuntime> = {};
  const graph = buildGraph(project, snap.devices);
  const pot = computePotentials(project, graph);
  const shortNets = new Set(snap.shorts.map((s) => s.netId));
  const liveNets = new Set<number>();
  for (const [netId, tags] of pot.byNet) {
    if (
      tags.some(
        (t: PotentialTag) => t.potential !== 'N' && t.potential !== 'PE' && t.potential !== 'DC0',
      )
    ) {
      liveNets.add(netId);
    }
  }

  const flowWires = new Set<string>();
  const adj = buildAdjacency(graph);
  const sources: TerminalRef[] = [];
  for (const d of project.devices) {
    if (d.type.kind === 'supply') {
      for (const t of d.type.terminals) {
        if (t.id === 'L1' || t.id === 'L2' || t.id === 'L3' || t.id === 'N') {
          sources.push(`${d.instance.tag}:${t.id}`);
        }
      }
    }
  }
  const sourceSet = new Set(sources);

  const markPath = (from: TerminalRef): void => {
    if (!graph.netOf.has(from)) return;
    const visited = new Set<TerminalRef>([from]);
    const parent = new Map<TerminalRef, { from: TerminalRef; edge: Edge }>();
    const queue: TerminalRef[] = [from];
    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur === undefined) break;
      if (sourceSet.has(cur)) {
        let cursor: TerminalRef | undefined = cur;
        while (cursor !== undefined) {
          const p = parent.get(cursor);
          if (!p) break;
          if (p.edge.kind === 'wire' && p.edge.wireId) flowWires.add(p.edge.wireId);
          cursor = p.from;
        }
        return;
      }
      for (const e of adj.byTerminal.get(cur) ?? []) {
        const next = e.a === cur ? e.b : e.a;
        if (visited.has(next)) continue;
        visited.add(next);
        parent.set(next, { from: cur, edge: e });
        queue.push(next);
      }
    }
  };

  for (const d of project.devices) {
    const st = snap.devices[d.instance.tag];
    if (!st) continue;
    const active =
      (d.type.kind === 'contactor' && st.closed) ||
      (d.type.kind === 'motor' && st.running) ||
      (d.type.kind === 'lamp' && st.lit) ||
      (d.type.kind === 'psu' && st.out);
    if (!active) continue;
    for (const load of d.type.loads ?? []) {
      markPath(`${d.instance.tag}:${load.a}`);
      markPath(`${d.instance.tag}:${load.b}`);
    }
  }

  for (const w of project.wires) {
    const netId = graph.netOf.get(w.a);
    const isShort = netId !== undefined && shortNets.has(netId);
    const isLive = netId !== undefined && liveNets.has(netId);
    out[w.id] = {
      live: isLive,
      flow: !isShort && flowWires.has(w.id),
      short: isShort,
    };
  }
  return out;
};

const snapshotToView = (project: ResolvedProject, snap: SimSnapshot): SimView => ({
  t: snap.t,
  devices: snap.devices,
  wires: buildWireRuntime(project, snap),
  shorts: snap.shorts,
  events: snap.events.slice(-100),
});

const refreshView = (project: ResolvedProject, sim: SimState): SimView => {
  // stepMany with 0 ms produces a fresh snapshot without advancing time.
  const snap = stepMany(sim, project, 0);
  return snapshotToView(project, snap);
};

export const useSimStore = create<SimStoreState>((set, get) => ({
  on: false,
  running: false,
  speed: 1,
  view: EMPTY_VIEW,
  _sim: null,
  _project: null,
  _lastWallMs: null,

  attachProject(project) {
    const prev = get()._project;
    set({ _project: project });
    if (!get().on || !get()._sim) return;
    // When topology changes while sim runs, keep running states; refresh view.
    if (prev !== project) {
      set({ view: refreshView(project, get()._sim!) });
    }
  },

  turnOn(project, initialStates) {
    const sim = createSimState();
    if (initialStates) {
      for (const [tag, patch] of Object.entries(initialStates)) {
        sim.states[tag] = { ...(sim.states[tag] ?? {}), ...patch };
      }
    }
    const view = refreshView(project, sim);
    set({
      on: true,
      running: true,
      _sim: sim,
      _project: project,
      _lastWallMs: null,
      view,
    });
  },

  turnOff() {
    set({
      on: false,
      running: false,
      _sim: null,
      _lastWallMs: null,
      view: EMPTY_VIEW,
    });
  },

  togglePlay() {
    set((s) => ({ running: !s.running, _lastWallMs: null }));
  },

  setSpeed(s) {
    set({ speed: s, _lastWallMs: null });
  },

  stepOnce(ms = 10) {
    const { _sim, _project } = get();
    if (!_sim || !_project) return;
    const take = Math.max(1, Math.floor(ms));
    const snap = stepMany(_sim, _project, take);
    set({ view: snapshotToView(_project, snap) });
  },

  tick(wallNowMs) {
    const { _sim, _project, on, running, speed, _lastWallMs } = get();
    if (!on || !running || !_sim || !_project) {
      if (_lastWallMs !== null) set({ _lastWallMs: null });
      return;
    }
    if (_lastWallMs === null) {
      set({ _lastWallMs: wallNowMs });
      return;
    }
    const dWall = Math.max(0, wallNowMs - _lastWallMs);
    const capped = Math.min(dWall, 200);
    const simMs = Math.max(0, Math.floor(capped * speed));
    if (simMs <= 0) {
      set({ _lastWallMs: wallNowMs });
      return;
    }
    const snap = stepMany(_sim, _project, simMs);
    set({ _lastWallMs: wallNowMs, view: snapshotToView(_project, snap) });
  },

  setDeviceState(tag, patch) {
    const { _sim, _project } = get();
    if (!_sim || !_project) return;
    const st = _sim.states[tag] ?? {};
    // Kłódka LOTO: zablokowany wyłącznik nie wchodzi w on=true.
    const next = { ...st, ...patch } as typeof st;
    const dev = _project.byTag.get(tag);
    if (dev?.type.kind === 'mainSwitch' && st.locked && next.on === true) {
      next.on = false;
    }
    _sim.states[tag] = next;
    set({ view: refreshView(_project, _sim) });
  },

  pressButton(tag, pressed) {
    get().setDeviceState(tag, { pressed });
  },

  setLock(tag, locked) {
    const { _sim, _project } = get();
    if (!_sim || !_project) return;
    const st = _sim.states[tag] ?? {};
    const next = { ...st, locked } as typeof st;
    // Założenie kłódki wymaga wyłącznika w pozycji 0.
    if (locked) next.on = false;
    _sim.states[tag] = next;
    set({ view: refreshView(_project, _sim) });
  },
}));
