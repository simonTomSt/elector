import type { TerminalRef } from '@/domain/types';
import type { ResolvedProject } from './model';
import { terminalRef } from './model';
import type { Edge, Graph } from './graph';
import type { ShortCircuit } from './potentials';

export interface Trip {
  deviceTag: string;
  reason: 'magnetic';
  timeMs: number;
  short: ShortCircuit;
}

interface Adjacency {
  byTerminal: Map<TerminalRef, Edge[]>;
}

const buildAdjacency = (graph: Graph): Adjacency => {
  const m = new Map<TerminalRef, Edge[]>();
  for (const e of graph.edges) {
    const a = m.get(e.a);
    if (a) a.push(e);
    else m.set(e.a, [e]);
    const b = m.get(e.b);
    if (b) b.push(e);
    else m.set(e.b, [e]);
  }
  return { byTerminal: m };
};

const BREAKER_KINDS = new Set(['mcb', 'motorBreaker']);

const AC_LINES = new Set<string>(['L1', 'L2', 'L3']);

const findSourceTerminals = (
  project: ResolvedProject,
  short: ShortCircuit,
): TerminalRef[] => {
  const result: TerminalRef[] = [];
  for (const dev of project.devices) {
    if (dev.type.kind === 'supply') {
      for (const t of dev.type.terminals) {
        if (!AC_LINES.has(t.id)) continue;
        if (short.pair.some((p) => p.sourceId === dev.instance.tag && p.potential === t.id)) {
          result.push(terminalRef(dev.type, dev.instance.tag, t.id));
        }
      }
    } else if (dev.type.kind === 'psu') {
      if (short.kind === 'DC' && short.pair.some((p) => p.sourceId === dev.instance.tag)) {
        result.push(terminalRef(dev.type, dev.instance.tag, '+'));
      }
    }
  }
  return result;
};

const firstBreakerOnPath = (
  project: ResolvedProject,
  graph: Graph,
  shortNet: number,
  sources: TerminalRef[],
): string | undefined => {
  const adj = buildAdjacency(graph);
  const kindOf = new Map<string, string>();
  for (const d of project.devices) kindOf.set(d.instance.tag, d.type.kind);

  const visited = new Set<TerminalRef>();
  const queue: { term: TerminalRef; breaker: string | undefined }[] = [];
  for (const s of sources) {
    if (!visited.has(s)) {
      visited.add(s);
      queue.push({ term: s, breaker: undefined });
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (graph.netOf.get(current.term) === shortNet && current.breaker !== undefined) {
      return current.breaker;
    }
    const edges = adj.byTerminal.get(current.term) ?? [];
    for (const e of edges) {
      const next = e.a === current.term ? e.b : e.a;
      if (visited.has(next)) continue;
      visited.add(next);
      let breaker = current.breaker;
      if (e.kind === 'contact' && e.deviceTag && BREAKER_KINDS.has(kindOf.get(e.deviceTag) ?? '')) {
        if (!breaker) breaker = e.deviceTag;
      }
      queue.push({ term: next, breaker });
    }
  }
  return undefined;
};

export const detectTrips = (
  project: ResolvedProject,
  graph: Graph,
  shorts: ShortCircuit[],
): Trip[] => {
  const trips: Trip[] = [];
  for (const short of shorts) {
    const sources = findSourceTerminals(project, short);
    if (sources.length === 0) continue;
    const breaker = firstBreakerOnPath(project, graph, short.netId, sources);
    if (!breaker) continue;
    trips.push({ deviceTag: breaker, reason: 'magnetic', timeMs: 4, short });
  }
  return trips;
};
