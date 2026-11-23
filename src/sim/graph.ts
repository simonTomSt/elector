import type { Contact } from '@/domain/types';
import type { TerminalRef } from '@/domain/types';
import type { ResolvedDevice, ResolvedProject } from './model';
import { terminalRef } from './model';
import type { DeviceRuntimeState, DeviceStates } from './state';
import { defaultStateFor } from './state';

export type EdgeKind = 'wire' | 'link' | 'contact' | 'thermal';

export interface Edge {
  a: TerminalRef;
  b: TerminalRef;
  kind: EdgeKind;
  deviceTag?: string;
  wireId?: string;
  contact?: Contact;
}

export interface Net {
  id: number;
  terminals: TerminalRef[];
}

export interface Graph {
  edges: Edge[];
  nets: Net[];
  netOf: ReadonlyMap<TerminalRef, number>;
}

const isContactClosed = (c: Contact, state: DeviceRuntimeState): boolean => {
  const active = (() => {
    switch (c.actuator) {
      case 'coil':
        return state.closed === true;
      case 'handle':
        return state.on === true && state.tripped !== true;
      case 'button':
        return state.pressed === true;
      case 'thermal':
        return state.tripped === true;
      case 'trip':
        return state.tripped === true;
    }
  })();
  return c.type === 'NO' ? active : !active;
};

const stateOf = (device: ResolvedDevice, states: DeviceStates): DeviceRuntimeState =>
  states[device.instance.tag] ?? defaultStateFor(device.type.kind);

class UnionFind {
  private parent = new Map<string, string>();
  find(x: string): string {
    const p = this.parent.get(x);
    if (!p || p === x) {
      if (!p) this.parent.set(x, x);
      return x;
    }
    const r = this.find(p);
    this.parent.set(x, r);
    return r;
  }
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
  add(x: string): void {
    if (!this.parent.has(x)) this.parent.set(x, x);
  }
}

export const buildGraph = (project: ResolvedProject, states: DeviceStates): Graph => {
  const edges: Edge[] = [];
  const uf = new UnionFind();

  for (const dev of project.devices) {
    for (const t of dev.terminalRefs) uf.add(t);
  }

  for (const dev of project.devices) {
    const { instance, type } = dev;
    if (type.links) {
      for (const [a, b] of type.links) {
        const ra = terminalRef(type, instance.tag, a);
        const rb = terminalRef(type, instance.tag, b);
        edges.push({ a: ra, b: rb, kind: 'link', deviceTag: instance.tag });
        uf.union(ra, rb);
      }
    }
    if (type.kind === 'overload' && type.contacts) {
      for (const pole of [
        ['1', '2'],
        ['3', '4'],
        ['5', '6'],
      ] as const) {
        const ra = terminalRef(type, instance.tag, pole[0]);
        const rb = terminalRef(type, instance.tag, pole[1]);
        if (dev.terminalRefs.includes(ra) && dev.terminalRefs.includes(rb)) {
          edges.push({ a: ra, b: rb, kind: 'thermal', deviceTag: instance.tag });
          uf.union(ra, rb);
        }
      }
    }
    if (type.contacts) {
      const st = stateOf(dev, states);
      for (const c of type.contacts) {
        if (isContactClosed(c, st)) {
          const ra = terminalRef(type, instance.tag, c.from);
          const rb = terminalRef(type, instance.tag, c.to);
          edges.push({ a: ra, b: rb, kind: 'contact', deviceTag: instance.tag, contact: c });
          uf.union(ra, rb);
        }
      }
    }
  }

  for (const wire of project.wires) {
    if (wire.fault === 'open') continue;
    uf.add(wire.a);
    uf.add(wire.b);
    edges.push({ a: wire.a, b: wire.b, kind: 'wire', wireId: wire.id });
    uf.union(wire.a, wire.b);
  }

  const groups = new Map<string, TerminalRef[]>();
  const terminalsAll: TerminalRef[] = [];
  for (const dev of project.devices) for (const t of dev.terminalRefs) terminalsAll.push(t);
  for (const w of project.wires) {
    if (!project.terminalIndex.has(w.a)) terminalsAll.push(w.a);
    if (!project.terminalIndex.has(w.b)) terminalsAll.push(w.b);
  }

  for (const t of terminalsAll) {
    const root = uf.find(t);
    const arr = groups.get(root);
    if (arr) arr.push(t);
    else groups.set(root, [t]);
  }

  const nets: Net[] = [];
  const netOf = new Map<TerminalRef, number>();
  let i = 0;
  for (const terms of groups.values()) {
    const id = i++;
    nets.push({ id, terminals: terms });
    for (const t of terms) netOf.set(t, id);
  }

  return { edges, nets, netOf };
};
