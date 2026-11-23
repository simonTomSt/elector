import type { Potential, TerminalRef } from '@/domain/types';
import type { ResolvedDevice, ResolvedProject } from './model';
import { terminalRef } from './model';
import type { Graph } from './graph';
import type { Potentials, PotentialTag } from './potentials';

export type LoadKind = 'coilDC' | 'coilAC' | 'lamp' | 'psuIn' | 'motorWinding';

export interface EnergizedLoad {
  deviceTag: string;
  kind: LoadKind;
  a: TerminalRef;
  b: TerminalRef;
  sourceId?: string;
  voltage: number;
}

const AC_LINES = new Set<Potential>(['L1', 'L2', 'L3']);

const nominalU = (type: ResolvedDevice['type']): number => {
  const u = type.params?.['Un'];
  if (typeof u === 'number') return u;
  const uc = type.params?.['Ucoil'];
  if (typeof uc === 'number') return uc;
  return 24;
};

const lineOf = (tags: PotentialTag[]): PotentialTag | undefined =>
  tags.find((t) => AC_LINES.has(t.potential));

const nOf = (tags: PotentialTag[]): PotentialTag | undefined =>
  tags.find((t) => t.potential === 'N');

const plusOf = (tags: PotentialTag[]): PotentialTag | undefined =>
  tags.find((t) => t.potential === 'DC+');

const zeroOf = (tags: PotentialTag[]): PotentialTag | undefined =>
  tags.find((t) => t.potential === 'DC0');

const tagsFor = (
  ref: TerminalRef,
  graph: Graph,
  pot: Potentials,
): PotentialTag[] => {
  const net = graph.netOf.get(ref);
  if (net === undefined) return [];
  return pot.byNet.get(net) ?? [];
};

const evaluateCoilDC = (
  ta: PotentialTag[],
  tb: PotentialTag[],
): { sourceId: string; voltage: number } | undefined => {
  const plus = plusOf(ta);
  const zero = zeroOf(tb);
  if (plus && zero && plus.sourceId === zero.sourceId) {
    return { sourceId: plus.sourceId, voltage: 24.1 };
  }
  const plus2 = plusOf(tb);
  const zero2 = zeroOf(ta);
  if (plus2 && zero2 && plus2.sourceId === zero2.sourceId) {
    return { sourceId: plus2.sourceId, voltage: 24.1 };
  }
  return undefined;
};

const evaluateAcLN = (
  ta: PotentialTag[],
  tb: PotentialTag[],
): { sourceId: string; voltage: number } | undefined => {
  const l = lineOf(ta);
  const n = nOf(tb);
  if (l && n && l.sourceId === n.sourceId) return { sourceId: l.sourceId, voltage: 230 };
  const l2 = lineOf(tb);
  const n2 = nOf(ta);
  if (l2 && n2 && l2.sourceId === n2.sourceId) return { sourceId: l2.sourceId, voltage: 230 };
  return undefined;
};

export const evaluateLoads = (
  project: ResolvedProject,
  graph: Graph,
  pot: Potentials,
): EnergizedLoad[] => {
  const result: EnergizedLoad[] = [];
  for (const dev of project.devices) {
    const loads = dev.type.loads;
    if (!loads) continue;
    for (const load of loads) {
      const ra = terminalRef(dev.type, dev.instance.tag, load.a);
      const rb = terminalRef(dev.type, dev.instance.tag, load.b);
      const ta = tagsFor(ra, graph, pot);
      const tb = tagsFor(rb, graph, pot);
      let energized: { sourceId: string; voltage: number } | undefined;
      if (load.kind === 'coilDC') energized = evaluateCoilDC(ta, tb);
      else if (load.kind === 'coilAC' || load.kind === 'psuIn')
        energized = evaluateAcLN(ta, tb);
      else if (load.kind === 'lamp') {
        const Un = typeof dev.type.params?.['Un'] === 'number' ? (dev.type.params['Un'] as number) : 24;
        energized = Un >= 100 ? evaluateAcLN(ta, tb) : evaluateCoilDC(ta, tb);
      }
      if (!energized) continue;
      const U = load.kind === 'coilDC' ? energized.voltage : nominalU(dev.type);
      result.push({
        deviceTag: dev.instance.tag,
        kind: load.kind as LoadKind,
        a: ra,
        b: rb,
        sourceId: energized.sourceId,
        voltage: U === 24 ? energized.voltage : U,
      });
    }
  }
  return result;
};

export const motorPhases = (
  motor: ResolvedDevice,
  graph: Graph,
  pot: Potentials,
): { u?: PotentialTag; v?: PotentialTag; w?: PotentialTag } => {
  const refs = ['U1', 'V1', 'W1'] as const;
  const out: { u?: PotentialTag; v?: PotentialTag; w?: PotentialTag } = {};
  for (const r of refs) {
    const ref = terminalRef(motor.type, motor.instance.tag, r);
    const tags = tagsFor(ref, graph, pot);
    const line = lineOf(tags);
    if (!line) continue;
    if (r === 'U1') out.u = line;
    else if (r === 'V1') out.v = line;
    else out.w = line;
  }
  return out;
};

export const motorFaseCount = (
  motor: ResolvedDevice,
  graph: Graph,
  pot: Potentials,
): number => {
  const p = motorPhases(motor, graph, pot);
  const names = new Set<string>();
  if (p.u) names.add(`${p.u.sourceId}:${p.u.potential}`);
  if (p.v) names.add(`${p.v.sourceId}:${p.v.potential}`);
  if (p.w) names.add(`${p.w.sourceId}:${p.w.potential}`);
  return names.size;
};
