import type { TerminalRef } from '@/domain/types';
import type { Edge, Graph } from './graph';
import type { ResolvedProject } from './model';
import { terminalRef } from './model';

export interface Adjacency {
  byTerminal: Map<TerminalRef, Edge[]>;
}

export const buildAdjacency = (graph: Graph): Adjacency => {
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

/**
 * BFS shortest path from source terminals to target terminal.
 * Returns the edges along the path, or undefined if unreachable.
 */
const bfsPath = (
  graph: Graph,
  sources: TerminalRef[],
  target: TerminalRef,
  cachedAdj?: Adjacency,
): Edge[] | undefined => {
  const adj = cachedAdj ?? buildAdjacency(graph);
  const parent = new Map<TerminalRef, { from: TerminalRef; edge: Edge }>();
  const visited = new Set<TerminalRef>(sources);
  const queue: TerminalRef[] = [...sources];
  if (sources.includes(target)) return [];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    const edges = adj.byTerminal.get(cur) ?? [];
    for (const e of edges) {
      const next = e.a === cur ? e.b : e.a;
      if (visited.has(next)) continue;
      visited.add(next);
      parent.set(next, { from: cur, edge: e });
      if (next === target) {
        const chain: Edge[] = [];
        let cursor: TerminalRef | undefined = next;
        while (cursor !== undefined) {
          const p = parent.get(cursor);
          if (!p) break;
          chain.push(p.edge);
          cursor = p.from;
        }
        return chain.reverse();
      }
      queue.push(next);
    }
  }
  return undefined;
};

export interface PathAnalysis {
  overloadTags: Set<string>;
  breakerTags: Set<string>;
  wireIds: Set<string>;
}

/**
 * Trace a shortest path from a motor terminal back to any supply L-terminal.
 * Returns all overload (thermal) and breaker (handle) devices passed through.
 */
export const traceMotorPath = (
  project: ResolvedProject,
  graph: Graph,
  motorTerminal: TerminalRef,
  cachedAdj?: Adjacency,
): PathAnalysis => {
  const sources: TerminalRef[] = [];
  for (const dev of project.devices) {
    if (dev.type.kind === 'supply') {
      for (const t of dev.type.terminals) {
        if (t.id === 'L1' || t.id === 'L2' || t.id === 'L3') {
          sources.push(terminalRef(dev.type, dev.instance.tag, t.id));
        }
      }
    }
  }
  const path = bfsPath(graph, sources, motorTerminal, cachedAdj);
  const out: PathAnalysis = {
    overloadTags: new Set(),
    breakerTags: new Set(),
    wireIds: new Set(),
  };
  if (!path) return out;
  const kindOf = new Map<string, string>();
  for (const d of project.devices) kindOf.set(d.instance.tag, d.type.kind);
  for (const e of path) {
    if (e.deviceTag) {
      const k = kindOf.get(e.deviceTag);
      if (k === 'overload' && (e.kind === 'thermal' || e.kind === 'link')) {
        out.overloadTags.add(e.deviceTag);
      }
    }
    if (e.kind === 'contact' && e.deviceTag && e.contact?.actuator === 'handle') {
      out.breakerTags.add(e.deviceTag);
    }
    if (e.kind === 'wire' && e.wireId) out.wireIds.add(e.wireId);
  }
  return out;
};
