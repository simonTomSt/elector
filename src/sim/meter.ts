import type { TerminalRef } from '@/domain/types';
import type { ResolvedDevice, ResolvedProject } from './model';
import { terminalRef } from './model';
import { buildGraph, type Graph } from './graph';
import { computePotentials, type PotentialTag, type Potentials } from './potentials';
import type { DeviceStates } from './state';

export type MeterRange = 'off' | 'vac' | 'vdc' | 'ohm' | 'cont' | 'aac';

export type MeterReadingValue = number | 'OL' | 'BLOK' | '—';

export interface MeterReading {
  range: MeterRange;
  value: MeterReadingValue;
  unit: '' | 'V' | 'Ω' | 'A';
  probes: readonly [TerminalRef | null, TerminalRef | null];
  continuity?: boolean;
}

const AC_LINES = new Set<PotentialTag['potential']>(['L1', 'L2', 'L3']);

const netOf = (graph: Graph, ref: TerminalRef | null): number | undefined =>
  ref === null ? undefined : graph.netOf.get(ref);

const tagsOf = (pot: Potentials, netId: number | undefined): PotentialTag[] =>
  netId === undefined ? [] : pot.byNet.get(netId) ?? [];

/** True gdy sieć jest „gorąca" (nie tylko neutralna / PE / DC0). */
const hasHotPotential = (tags: PotentialTag[]): boolean =>
  tags.some((t) => t.potential !== 'PE' && t.potential !== 'N' && t.potential !== 'DC0');

/** Deterministic ±0,5 V noise for AC voltage – stable per net pair. */
const noiseFor = (netA: number, netB: number): number => {
  const seed = ((netA + 1) * 131 + (netB + 1) * 17) % 97;
  return (seed / 97 - 0.5) * 1.0; // ≈ ±0,5 V
};

const measureVac = (
  ta: PotentialTag[],
  tb: PotentialTag[],
  netA: number,
  netB: number,
): MeterReadingValue => {
  const la = ta.find((p) => AC_LINES.has(p.potential));
  const lb = tb.find((p) => AC_LINES.has(p.potential));
  const na = ta.find((p) => p.potential === 'N' || p.potential === 'PE');
  const nb = tb.find((p) => p.potential === 'N' || p.potential === 'PE');
  if (la && lb && la.potential !== lb.potential && la.sourceId === lb.sourceId) {
    return 400 + noiseFor(netA, netB);
  }
  if ((la && nb && la.sourceId === nb.sourceId) || (lb && na && lb.sourceId === na.sourceId)) {
    return 230 + noiseFor(netA, netB);
  }
  return 0;
};

const measureVdc = (ta: PotentialTag[], tb: PotentialTag[]): MeterReadingValue => {
  const plusA = ta.find((p) => p.potential === 'DC+');
  const zeroB = tb.find((p) => p.potential === 'DC0');
  if (plusA && zeroB && plusA.sourceId === zeroB.sourceId) return 24.1;
  const plusB = tb.find((p) => p.potential === 'DC+');
  const zeroA = ta.find((p) => p.potential === 'DC0');
  if (plusB && zeroA && plusB.sourceId === zeroA.sourceId) return -24.1;
  // Przy pomiarze DC na AC miernik wskazuje ~0,02 V (szum)
  if (ta.some((p) => AC_LINES.has(p.potential)) || tb.some((p) => AC_LINES.has(p.potential))) {
    return 0.02;
  }
  return 0;
};

const findDeviceSpanning = (
  project: ResolvedProject,
  pa: TerminalRef,
  pb: TerminalRef,
): { dev: ResolvedDevice; resistance: number } | undefined => {
  for (const dev of project.devices) {
    for (const load of dev.type.loads ?? []) {
      const la = terminalRef(dev.type, dev.instance.tag, load.a);
      const lb = terminalRef(dev.type, dev.instance.tag, load.b);
      const match = (la === pa && lb === pb) || (la === pb && lb === pa);
      if (!match) continue;
      // Preferuj parametr Rcoil / Rwinding / R, inaczej wylicz z U²/P.
      const params: Record<string, unknown> = { ...dev.type.params, ...(dev.instance.params ?? {}) };
      const rExplicit = (['Rcoil', 'Rwinding', 'R'] as const)
        .map((k) => params[k])
        .find((v) => typeof v === 'number') as number | undefined;
      if (typeof rExplicit === 'number') return { dev, resistance: rExplicit };
      const U = typeof params['Un'] === 'number' ? (params['Un'] as number) : 230;
      const P = typeof params['P'] === 'number' ? (params['P'] as number) : undefined;
      if (typeof P === 'number' && P > 0) return { dev, resistance: (U * U) / P };
      return { dev, resistance: 1000 };
    }
  }
  return undefined;
};

const sameNetBaseOhm = (netA: number, netB: number): number => {
  if (netA !== netB) return Number.POSITIVE_INFINITY;
  // 0,1–0,3 Ω deterministycznie
  const seed = ((netA + 1) * 29) % 20;
  return 0.1 + seed / 100; // 0,10–0,29
};

const measureOhm = (
  project: ResolvedProject,
  pot: Potentials,
  graph: Graph,
  pa: TerminalRef,
  pb: TerminalRef,
  netA: number | undefined,
  netB: number | undefined,
): MeterReadingValue => {
  const ta = tagsOf(pot, netA);
  const tb = tagsOf(pot, netB);
  if (hasHotPotential(ta) || hasHotPotential(tb)) return 'BLOK';
  if (netA === undefined || netB === undefined) return 'OL';
  if (netA === netB) return sameNetBaseOhm(netA, netB);
  const through = findDeviceSpanning(project, pa, pb);
  if (through) return Math.round(through.resistance * 10) / 10;
  // Sprawdź też przez sieci (jeśli oba zaciski cewki rozdzielone stanem styków) – wystarczy poszukać loada
  // którego a/b są odpowiednio w sieci netA i netB.
  for (const dev of project.devices) {
    for (const load of dev.type.loads ?? []) {
      const la = terminalRef(dev.type, dev.instance.tag, load.a);
      const lb = terminalRef(dev.type, dev.instance.tag, load.b);
      const laNet = graph.netOf.get(la);
      const lbNet = graph.netOf.get(lb);
      if (laNet === undefined || lbNet === undefined) continue;
      if ((laNet === netA && lbNet === netB) || (laNet === netB && lbNet === netA)) {
        const found = findDeviceSpanning(project, la, lb);
        if (found) return Math.round(found.resistance * 10) / 10;
      }
    }
  }
  return 'OL';
};

const measureCont = (
  project: ResolvedProject,
  pot: Potentials,
  graph: Graph,
  pa: TerminalRef,
  pb: TerminalRef,
  netA: number | undefined,
  netB: number | undefined,
): MeterReading => {
  const val = measureOhm(project, pot, graph, pa, pb, netA, netB);
  const num = typeof val === 'number' ? val : null;
  return {
    range: 'cont',
    value: val,
    unit: val === 'BLOK' ? '' : 'Ω',
    probes: [pa, pb],
    continuity: num !== null && num < 30,
  };
};

/** Approx. current through a wire via sim snapshot states (A~ clamp). */
const measureAac = (
  project: ResolvedProject,
  states: DeviceStates,
  pa: TerminalRef | null,
): MeterReadingValue => {
  if (!pa) return 0;
  // Jeśli sonda-cęgi jest na zacisku silnika – zwróć prąd silnika.
  for (const dev of project.devices) {
    if (dev.type.kind !== 'motor') continue;
    if (dev.terminalRefs.includes(pa)) {
      const st = states[dev.instance.tag];
      return typeof st?.current === 'number' ? Math.round(st.current * 10) / 10 : 0;
    }
  }
  void project;
  return 0;
};

export interface MeasureInput {
  project: ResolvedProject;
  states: DeviceStates;
  range: MeterRange;
  probes: readonly [TerminalRef | null, TerminalRef | null];
}

export const measureMeter = (input: MeasureInput): MeterReading => {
  const { project, states, range, probes } = input;
  if (range === 'off') {
    return { range, value: '—', unit: '', probes };
  }
  const graph = buildGraph(project, states);
  const pot = computePotentials(project, graph);
  const [pa, pb] = probes;
  const netA = netOf(graph, pa);
  const netB = netOf(graph, pb);

  if (range === 'vac') {
    if (netA === undefined || netB === undefined) {
      return { range, value: 0, unit: 'V', probes };
    }
    const value = measureVac(tagsOf(pot, netA), tagsOf(pot, netB), netA, netB);
    const rounded =
      typeof value === 'number' ? Math.round(value * 10) / 10 : value;
    return { range, value: rounded, unit: 'V', probes };
  }
  if (range === 'vdc') {
    const value = measureVdc(tagsOf(pot, netA), tagsOf(pot, netB));
    return { range, value, unit: 'V', probes };
  }
  if (range === 'ohm') {
    if (!pa || !pb) return { range, value: 'OL', unit: 'Ω', probes };
    const value = measureOhm(project, pot, graph, pa, pb, netA, netB);
    return { range, value, unit: value === 'BLOK' ? '' : 'Ω', probes };
  }
  if (range === 'cont') {
    if (!pa || !pb) return { range, value: 'OL', unit: 'Ω', probes, continuity: false };
    return measureCont(project, pot, graph, pa, pb, netA, netB);
  }
  if (range === 'aac') {
    const value = measureAac(project, states, pa);
    return { range, value, unit: 'A', probes };
  }
  return { range, value: '—', unit: '', probes };
};
