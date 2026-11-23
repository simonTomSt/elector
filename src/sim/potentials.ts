import type { Potential, TerminalRef } from '@/domain/types';
import type { ResolvedProject } from './model';
import { terminalRef } from './model';
import type { Graph } from './graph';

export interface PotentialTag {
  potential: Potential;
  sourceId: string;
}

export interface Potentials {
  byNet: ReadonlyMap<number, PotentialTag[]>;
  shortCircuits: ShortCircuit[];
}

export interface ShortCircuit {
  netId: number;
  kind: 'L-N' | 'L-PE' | 'L-L' | 'DC';
  pair: [PotentialTag, PotentialTag];
}

const AC_LINES = new Set<Potential>(['L1', 'L2', 'L3']);

const sameSource = (a: PotentialTag, b: PotentialTag): boolean => a.sourceId === b.sourceId;

const classifyShort = (tags: PotentialTag[]): ShortCircuit['kind'] | null => {
  const names = new Set(tags.map((t) => t.potential));
  const lines = [...names].filter((p) => AC_LINES.has(p));
  if (lines.length >= 2) return 'L-L';
  const hasLine = lines.length === 1;
  if (hasLine && names.has('N')) return 'L-N';
  if (hasLine && names.has('PE')) return 'L-PE';
  if (names.has('DC+') && names.has('DC0')) return 'DC';
  return null;
};

export const computePotentials = (project: ResolvedProject, graph: Graph): Potentials => {
  const byNet = new Map<number, PotentialTag[]>();

  const push = (netId: number, tag: PotentialTag): void => {
    const arr = byNet.get(netId);
    if (!arr) {
      byNet.set(netId, [tag]);
      return;
    }
    if (!arr.some((t) => t.potential === tag.potential && t.sourceId === tag.sourceId)) {
      arr.push(tag);
    }
  };

  for (const dev of project.devices) {
    if (dev.type.kind !== 'supply') continue;
    const potentials: Potential[] = ['L1', 'L2', 'L3', 'N', 'PE'];
    for (const p of potentials) {
      const ref: TerminalRef = terminalRef(dev.type, dev.instance.tag, p);
      const netId = graph.netOf.get(ref);
      if (netId !== undefined) push(netId, { potential: p, sourceId: dev.instance.tag });
    }
  }

  let changed = true;
  let guard = 0;
  while (changed && guard++ < 10) {
    changed = false;
    for (const dev of project.devices) {
      if (dev.type.kind !== 'psu') continue;
      const lRef = terminalRef(dev.type, dev.instance.tag, 'L');
      const nRef = terminalRef(dev.type, dev.instance.tag, 'N');
      const plusRef = terminalRef(dev.type, dev.instance.tag, '+');
      const minusRef = terminalRef(dev.type, dev.instance.tag, '-');
      const lNet = graph.netOf.get(lRef);
      const nNet = graph.netOf.get(nRef);
      const plusNet = graph.netOf.get(plusRef);
      const minusNet = graph.netOf.get(minusRef);
      if (lNet === undefined || nNet === undefined) continue;
      const lTags = byNet.get(lNet) ?? [];
      const nTags = byNet.get(nNet) ?? [];
      const energized = lTags.some(
        (lt) =>
          AC_LINES.has(lt.potential) &&
          nTags.some((nt) => nt.potential === 'N' && sameSource(lt, nt)),
      );
      if (!energized) continue;
      const before = (plusNet !== undefined ? byNet.get(plusNet)?.length ?? 0 : 0) +
        (minusNet !== undefined ? byNet.get(minusNet)?.length ?? 0 : 0);
      if (plusNet !== undefined) push(plusNet, { potential: 'DC+', sourceId: dev.instance.tag });
      if (minusNet !== undefined) push(minusNet, { potential: 'DC0', sourceId: dev.instance.tag });
      const after = (plusNet !== undefined ? byNet.get(plusNet)?.length ?? 0 : 0) +
        (minusNet !== undefined ? byNet.get(minusNet)?.length ?? 0 : 0);
      if (after > before) changed = true;
    }
  }

  const shortCircuits: ShortCircuit[] = [];
  for (const net of graph.nets) {
    const tags = byNet.get(net.id) ?? [];
    if (tags.length < 2) continue;
    const kind = classifyShort(tags);
    if (!kind) continue;
    const pick = (predicate: (t: PotentialTag) => boolean): PotentialTag | undefined =>
      tags.find(predicate);
    let pair: [PotentialTag, PotentialTag] | undefined;
    if (kind === 'L-L') {
      const [a, b] = tags.filter((t) => AC_LINES.has(t.potential));
      if (a && b) pair = [a, b];
    } else if (kind === 'L-N' || kind === 'L-PE') {
      const line = pick((t) => AC_LINES.has(t.potential));
      const ret = pick((t) =>
        kind === 'L-N' ? t.potential === 'N' : t.potential === 'PE',
      );
      if (line && ret) pair = [line, ret];
    } else {
      const plus = pick((t) => t.potential === 'DC+');
      const zero = pick((t) => t.potential === 'DC0');
      if (plus && zero) pair = [plus, zero];
    }
    if (pair) shortCircuits.push({ netId: net.id, kind, pair });
  }

  return { byNet, shortCircuits };
};
