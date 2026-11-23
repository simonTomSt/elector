import { create } from 'zustand';
import type {
  PotentialTag,
  Schematic,
  SchematicSymbol,
  SymbolElement,
  TerminalRef,
} from '@/domain/types';

export type SchematicTool = 'select' | 'wire' | 'node' | 'pot' | 'text';

export interface Point {
  x: number;
  y: number;
}

export interface WireDraft {
  from: TerminalRef;
  origin: Point;
  bends: Point[];
  cursor: Point;
}

interface State {
  tool: SchematicTool;
  symbols: SchematicSymbol[];
  connections: [TerminalRef, TerminalRef][];
  potentials: PotentialTag[];
  selectedSymbolId: string | null;
  sheet: number;
  draft: WireDraft | null;
  pendingPotentialName: string;

  setTool(tool: SchematicTool): void;
  setPendingPotentialName(name: string): void;
  loadSchematic(schematic: Schematic): void;
  getSchematic(): Schematic;
  addSymbol(element: SymbolElement, tag: string, pos: Point, pins: TerminalRef[]): string;
  removeSymbol(id: string): void;
  moveSymbol(id: string, pos: Point): void;
  selectSymbol(id: string | null): void;
  beginWire(from: TerminalRef, origin: Point): void;
  updateDraftCursor(cursor: Point): void;
  addDraftBend(point: Point): void;
  commitWire(to: TerminalRef): boolean;
  cancelWire(): void;
  addPotential(name: string, pos: Point, pin?: TerminalRef): string;
  removePotential(id: string): void;
}

const nextId = (prefix: string, existing: readonly { id: string }[]): string => {
  const used = new Set<number>();
  for (const item of existing) {
    const m = new RegExp(`^${prefix}(\\d+)$`).exec(item.id);
    if (m && m[1]) used.add(Number(m[1]));
  }
  let n = 1;
  while (used.has(n)) n += 1;
  return `${prefix}${n}`;
};

const samePair = (a: TerminalRef, b: TerminalRef, c: TerminalRef, d: TerminalRef): boolean =>
  (a === c && b === d) || (a === d && b === c);

export const useSchematicStore = create<State>((set, get) => ({
  tool: 'select',
  symbols: [],
  connections: [],
  potentials: [],
  selectedSymbolId: null,
  sheet: 1,
  draft: null,
  pendingPotentialName: '+24V',

  setTool(tool) {
    set({ tool, draft: null });
  },

  setPendingPotentialName(name) {
    set({ pendingPotentialName: name });
  },

  loadSchematic(schematic) {
    set({
      symbols: schematic.symbols.map((s) => ({ ...s })),
      connections: schematic.connections.map(([a, b]) => [a, b] as [TerminalRef, TerminalRef]),
      potentials: (schematic.potentials ?? []).map((p) => ({ ...p })),
      selectedSymbolId: null,
      draft: null,
    });
  },

  getSchematic() {
    const s = get();
    return {
      symbols: s.symbols,
      connections: s.connections,
      potentials: s.potentials,
    };
  },

  addSymbol(element, tag, pos, pins) {
    const { symbols, sheet } = get();
    const id = nextId('sym', symbols);
    const sym: SchematicSymbol = {
      id,
      tag,
      element,
      pins,
      x: pos.x,
      y: pos.y,
      sheet,
    };
    set({ symbols: [...symbols, sym], selectedSymbolId: id });
    return id;
  },

  removeSymbol(id) {
    const { symbols, connections, selectedSymbolId } = get();
    const sym = symbols.find((s) => s.id === id);
    if (!sym) return;
    const pinSet = new Set(sym.pins);
    const nextConnections = connections.filter(([a, b]) => !pinSet.has(a) && !pinSet.has(b));
    set({
      symbols: symbols.filter((s) => s.id !== id),
      connections: nextConnections,
      selectedSymbolId: selectedSymbolId === id ? null : selectedSymbolId,
    });
  },

  moveSymbol(id, pos) {
    const { symbols } = get();
    const next = symbols.map((s) => (s.id === id ? { ...s, x: pos.x, y: pos.y } : s));
    set({ symbols: next });
  },

  selectSymbol(id) {
    set({ selectedSymbolId: id });
  },

  beginWire(from, origin) {
    set({ draft: { from, origin, bends: [], cursor: origin } });
  },

  updateDraftCursor(cursor) {
    const d = get().draft;
    if (!d) return;
    set({ draft: { ...d, cursor } });
  },

  addDraftBend(point) {
    const d = get().draft;
    if (!d) return;
    set({ draft: { ...d, bends: [...d.bends, point], cursor: point } });
  },

  commitWire(to) {
    const { draft, connections } = get();
    if (!draft) return false;
    if (to === draft.from) return false;
    if (connections.some(([a, b]) => samePair(a, b, draft.from, to))) {
      set({ draft: null });
      return false;
    }
    set({
      connections: [...connections, [draft.from, to]],
      draft: null,
    });
    return true;
  },

  cancelWire() {
    set({ draft: null });
  },

  addPotential(name, pos, pin) {
    const { potentials, sheet } = get();
    const id = nextId('pot', potentials);
    const tag: PotentialTag = { id, name, x: pos.x, y: pos.y, sheet, ...(pin ? { pin } : {}) };
    set({ potentials: [...potentials, tag] });
    return id;
  },

  removePotential(id) {
    const { potentials } = get();
    set({ potentials: potentials.filter((p) => p.id !== id) });
  },
}));
