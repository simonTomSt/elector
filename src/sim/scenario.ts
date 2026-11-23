import type { ScenarioStep, Task, TerminalRef, Wire } from '@/domain/types';
import type { DeviceLibrary } from '@/tasks/devices';
import { buildProjectFromTask, resolveProject, type ResolvedProject } from './model';
import { createSimState, stepMany, type SimState } from './step';
import type { DeviceStates } from './state';
import { buildGraph } from './graph';
import { computePotentials, type PotentialTag } from './potentials';

export interface MeasurementReading {
  range: string;
  value: number | 'OL' | 'BLOK';
  probes: TerminalRef[];
}

export interface ScenarioResult {
  ok: boolean;
  failures: string[];
  readings: MeasurementReading[];
  finalStates: DeviceStates;
  finalT: number;
}

interface RunContext {
  sim: SimState;
  project: ResolvedProject;
  task: Task;
  dynamicWires: Wire[];
  activeFaults: Set<string>;
}

const closeMatch = (
  actual: number | undefined,
  expected: unknown,
): { ok: boolean; expectedRepr: string } => {
  if (expected && typeof expected === 'object' && 'approx' in expected) {
    const spec = expected as { approx: number; tol?: number };
    const tol = spec.tol ?? 0.05 * Math.abs(spec.approx) + 0.01;
    const a = actual ?? 0;
    return {
      ok: Math.abs(a - spec.approx) <= tol,
      expectedRepr: `${spec.approx} ±${tol}`,
    };
  }
  return {
    ok: actual === expected,
    expectedRepr: JSON.stringify(expected),
  };
};

const resolveExpectKey = (
  key: string,
  ctx: RunContext,
): number | boolean | string | undefined => {
  if (key === 'event') return undefined; // handled separately
  const dotIdx = key.lastIndexOf('.');
  if (dotIdx < 0) return undefined;
  const tag = key.slice(0, dotIdx);
  const field = key.slice(dotIdx + 1);
  const st = ctx.sim.states[tag];
  if (!st) return undefined;
  if (field === 'I' || field === 'current') return st.current;
  const v = (st as unknown as Record<string, unknown>)[field];
  if (typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string') return v;
  return undefined;
};

const applyFault = (ctx: RunContext, faultId: string): void => {
  const fault = ctx.task.faults?.find((f) => f.id === faultId);
  if (!fault) throw new Error(`Scenariusz: nie znaleziono usterki "${faultId}"`);
  ctx.activeFaults.add(faultId);
  if (fault.apply.wire && fault.apply.wireFault) {
    const wire = ctx.project.wires.find((w) => w.id === fault.apply.wire);
    if (wire) wire.fault = fault.apply.wireFault;
  }
  if (fault.apply.device && fault.apply.deviceFault) {
    const tag = fault.apply.device;
    const st = ctx.sim.states[tag] ?? {};
    if (fault.apply.deviceFault === 'tripped') st.tripped = true;
    if (fault.apply.deviceFault === 'coilOpen') st.coilOpen = true;
    ctx.sim.states[tag] = st;
  }
};

const addDynamicWire = (ctx: RunContext, state: Record<string, unknown>): void => {
  const w: Wire = {
    id: String(state['id'] ?? `dyn-${ctx.dynamicWires.length}`),
    a: String(state['a']),
    b: String(state['b']),
    color: (state['color'] as Wire['color']) ?? 'brown',
    cs: (state['cs'] as Wire['cs']) ?? 1.5,
  };
  ctx.project.wires.push(w);
  ctx.dynamicWires.push(w);
}

const measure = (
  ctx: RunContext,
  range: string,
  probes: TerminalRef[],
): MeasurementReading => {
  const graph = buildGraph(ctx.project, ctx.sim.states);
  const pot = computePotentials(ctx.project, graph);
  const pa = probes[0] ?? '';
  const pb = probes[1] ?? '';
  const ta = pot.byNet.get(graph.netOf.get(pa) ?? -1) ?? [];
  const tb = pot.byNet.get(graph.netOf.get(pb) ?? -1) ?? [];
  const AC = new Set(['L1', 'L2', 'L3']);
  const findBy = (tags: PotentialTag[], pred: (p: PotentialTag) => boolean) => tags.find(pred);

  if (range === 'vac') {
    const la = findBy(ta, (p) => AC.has(p.potential));
    const lb = findBy(tb, (p) => AC.has(p.potential));
    const na = findBy(ta, (p) => p.potential === 'N' || p.potential === 'PE');
    const nb = findBy(tb, (p) => p.potential === 'N' || p.potential === 'PE');
    if (la && lb && la.potential !== lb.potential && la.sourceId === lb.sourceId) {
      return { range, value: 400, probes };
    }
    if ((la && nb && la.sourceId === nb.sourceId) || (lb && na && lb.sourceId === na.sourceId)) {
      return { range, value: 230, probes };
    }
    return { range, value: 0, probes };
  }
  if (range === 'vdc') {
    const plusA = findBy(ta, (p) => p.potential === 'DC+');
    const zeroB = findBy(tb, (p) => p.potential === 'DC0');
    if (plusA && zeroB && plusA.sourceId === zeroB.sourceId) return { range, value: 24.1, probes };
    const plusB = findBy(tb, (p) => p.potential === 'DC+');
    const zeroA = findBy(ta, (p) => p.potential === 'DC0');
    if (plusB && zeroA && plusB.sourceId === zeroA.sourceId) return { range, value: 24.1, probes };
    return { range, value: 0, probes };
  }
  return { range, value: 0, probes };
};

const runStep = (ctx: RunContext, s: ScenarioStep, failures: string[], readings: MeasurementReading[]): void => {
  if (s.do === 'set') {
    const tag = s.tag ?? '';
    if (tag === '@addWire') {
      addDynamicWire(ctx, s.state ?? {});
      return;
    }
    if (tag === '@fault') {
      const id = String((s.state ?? {})['id']);
      applyFault(ctx, id);
      return;
    }
    const st = ctx.sim.states[tag] ?? {};
    Object.assign(st, s.state ?? {});
    ctx.sim.states[tag] = st;
    return;
  }
  if (s.do === 'press') {
    const tag = s.tag ?? '';
    const st = ctx.sim.states[tag] ?? {};
    st.pressed = true;
    ctx.sim.states[tag] = st;
    const holdMs = s.ms ?? 100;
    // Simulate holding: step through press period, then release.
    stepMany(ctx.sim, ctx.project, holdMs, 1);
    st.pressed = false;
    ctx.sim.states[tag] = st;
    return;
  }
  if (s.do === 'release') {
    const tag = s.tag ?? '';
    const st = ctx.sim.states[tag] ?? {};
    st.pressed = false;
    ctx.sim.states[tag] = st;
    return;
  }
  if (s.do === 'wait') {
    stepMany(ctx.sim, ctx.project, s.ms ?? 0, 1);
    return;
  }
  if (s.do === 'measure') {
    const reading = measure(ctx, s.range ?? 'vac', s.probes ?? []);
    readings.push(reading);
    if (s.expect && 'value' in s.expect) {
      const check = closeMatch(typeof reading.value === 'number' ? reading.value : undefined, s.expect['value']);
      if (!check.ok) {
        failures.push(
          `pomiar ${s.range} ${(s.probes ?? []).join('/')}: ${reading.value} ≠ ${check.expectedRepr}`,
        );
      }
    }
    return;
  }
  // No 'do' = pure expect
  if (s.expect) {
    for (const [key, expected] of Object.entries(s.expect)) {
      if (key === 'event') {
        const text = String(expected);
        const tagTokens = text.match(/-[A-Z][0-9]+/g) ?? [];
        const msTokens = text.match(/\b\d+\s*ms\b/g) ?? [];
        const found = ctx.sim.events.some((e) => {
          if (tagTokens.length === 0 && msTokens.length === 0) return e.text.includes(text);
          const anyTag = tagTokens.length === 0 || tagTokens.some((t) => e.text.includes(t));
          const allMs = msTokens.every((t) => e.text.includes(t));
          return anyTag && allMs;
        });
        if (!found) failures.push(`event niestwierdzony: "${text}"`);
        continue;
      }
      const actual = resolveExpectKey(key, ctx);
      const check = closeMatch(typeof actual === 'number' ? actual : undefined, expected);
      const okBool = typeof expected !== 'object' ? actual === expected : check.ok;
      if (!okBool) {
        failures.push(`${key}: ${JSON.stringify(actual)} ≠ ${JSON.stringify(expected)}`);
      }
    }
  }
};

export const runScenario = (
  task: Task,
  scenarioId: string,
  devices: DeviceLibrary,
): ScenarioResult => {
  const scenario = task.testScenarios?.find((s) => s.id === scenarioId);
  if (!scenario) throw new Error(`Scenariusz "${scenarioId}" nie istnieje w zadaniu ${task.id}`);
  const project = resolveProject(buildProjectFromTask(task), devices);
  const sim = createSimState();
  // W trybie symulacji schematu/mixed zakładamy, że wyłącznik główny jest załączony
  // (schemat go nie modeluje, a scenariusze testowe odnoszą się tylko do obwodu sterowania).
  if (task.type === 'schematic' || task.type === 'mixed') {
    const supplyTag = task.scene.supply;
    if (supplyTag) sim.states[supplyTag] = { on: true };
  }
  const ctx: RunContext = {
    sim,
    project,
    task,
    dynamicWires: [],
    activeFaults: new Set(),
  };
  const failures: string[] = [];
  const readings: MeasurementReading[] = [];
  for (const s of scenario.steps) {
    runStep(ctx, s, failures, readings);
  }
  return {
    ok: failures.length === 0,
    failures,
    readings,
    finalStates: ctx.sim.states,
    finalT: ctx.sim.t,
  };
};

export { stepMany };
