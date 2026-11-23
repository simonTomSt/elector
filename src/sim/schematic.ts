import type {
  Schematic,
  SchematicSymbol,
  SymbolElement,
  TerminalRef,
} from '@/domain/types';
import type { ResolvedProject } from '@/sim/model';

/** Lista elementów będących lustrzanym odbiciem cewki (styki pomocnicze/główne/termiczne). */
export const CONTACT_ELEMENTS: readonly SymbolElement[] = [
  'contactNO',
  'contactNC',
  'mainContacts3',
  'thermalNC',
  'thermalNO',
  'thermal3',
  'pbNO',
  'pbNC',
];

export const COIL_ELEMENTS: readonly SymbolElement[] = ['coil', 'coilTimer'];

/** Przyciski są samonośne – mają aktuator wbudowany, nie wymagają osobnej cewki. */
export const SELF_ACTUATED: readonly SymbolElement[] = ['pbNO', 'pbNC', 'thermal3'];

class UnionFind {
  private parent = new Map<string, string>();
  find(x: string): string {
    const v = this.parent.get(x);
    if (v === undefined) {
      this.parent.set(x, x);
      return x;
    }
    if (v === x) return x;
    const root = this.find(v);
    this.parent.set(x, root);
    return root;
  }
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

export interface SchematicNet {
  id: string;
  pins: TerminalRef[];
  /** Nazwy potencjałów przypisane do tej sieci. */
  potentials: string[];
}

export interface SchematicNetlist {
  nets: SchematicNet[];
  netOf: ReadonlyMap<TerminalRef, string>;
  /** Mapowanie pin-vertex → root (dla ERC) . */
  pinRoot: ReadonlyMap<TerminalRef, string>;
  /** Piny, które nie mają żadnego połączenia poza symbolem. */
  orphanPins: TerminalRef[];
}

const pinVertex = (pin: TerminalRef): string => `pin:${pin}`;
const potVertex = (name: string): string => `pot:${name}`;

const everyPin = (sym: SchematicSymbol): TerminalRef[] => sym.pins;

export const buildSchematicNetlist = (schematic: Schematic): SchematicNetlist => {
  const uf = new UnionFind();
  // Każdy pin to własny wierzchołek.
  const allPins = new Set<TerminalRef>();
  for (const s of schematic.symbols) {
    for (const p of everyPin(s)) {
      allPins.add(p);
      uf.find(pinVertex(p));
    }
  }
  // Połączenia narysowane.
  for (const [a, b] of schematic.connections) {
    allPins.add(a);
    allPins.add(b);
    uf.union(pinVertex(a), pinVertex(b));
  }
  // Piny o tym samym TerminalRef (ten sam fizyczny zacisk w różnych miejscach arkusza) są jedną siecią.
  const byRef = new Map<TerminalRef, TerminalRef[]>();
  for (const p of allPins) {
    const list = byRef.get(p);
    if (list) list.push(p);
    else byRef.set(p, [p]);
  }
  // (duplikaty byPin są naturalnie zunionowane: ten sam wierzchołek)
  // Potencjały: wszystkie etykiety o tej samej nazwie łączą swoje piny.
  for (const pot of schematic.potentials ?? []) {
    if (pot.pin) {
      uf.union(pinVertex(pot.pin), potVertex(pot.name));
      allPins.add(pot.pin);
    } else {
      uf.find(potVertex(pot.name));
    }
  }

  const pinRoot = new Map<TerminalRef, string>();
  const netsByRoot = new Map<string, SchematicNet>();
  for (const p of allPins) {
    const r = uf.find(pinVertex(p));
    pinRoot.set(p, r);
    let net = netsByRoot.get(r);
    if (!net) {
      net = { id: r, pins: [], potentials: [] };
      netsByRoot.set(r, net);
    }
    net.pins.push(p);
  }
  // Przypisz potencjały do sieci.
  const potNames = new Set<string>();
  for (const pot of schematic.potentials ?? []) potNames.add(pot.name);
  for (const name of potNames) {
    const r = uf.find(potVertex(name));
    let net = netsByRoot.get(r);
    if (!net) {
      net = { id: r, pins: [], potentials: [] };
      netsByRoot.set(r, net);
    }
    if (!net.potentials.includes(name)) net.potentials.push(name);
  }

  const orphanPins: TerminalRef[] = [];
  for (const [p, r] of pinRoot) {
    const net = netsByRoot.get(r)!;
    if (net.pins.length === 1 && net.potentials.length === 0) orphanPins.push(p);
  }

  const netOf = new Map<TerminalRef, string>();
  for (const [p, r] of pinRoot) netOf.set(p, r);

  return {
    nets: [...netsByRoot.values()],
    netOf,
    pinRoot,
    orphanPins,
  };
};

export type ErcCode =
  | 'open-pin'
  | 'double-potential'
  | 'coil-without-contacts'
  | 'contact-without-coil';

export interface ErcIssue {
  code: ErcCode;
  text: string;
  ref?: TerminalRef;
  tag?: string;
}

const tagsOf = (schematic: Schematic, pred: (s: SchematicSymbol) => boolean): Set<string> => {
  const out = new Set<string>();
  for (const s of schematic.symbols) if (pred(s)) out.add(s.tag);
  return out;
};

export const runErc = (
  schematic: Schematic,
  netlist?: SchematicNetlist,
): ErcIssue[] => {
  const nl = netlist ?? buildSchematicNetlist(schematic);
  const issues: ErcIssue[] = [];

  for (const pin of nl.orphanPins) {
    issues.push({ code: 'open-pin', text: `Otwarte połączenie ${pin}`, ref: pin });
  }

  for (const net of nl.nets) {
    if (net.potentials.length > 1) {
      issues.push({
        code: 'double-potential',
        text: `Dwa potencjały w jednej sieci: ${net.potentials.join(', ')}`,
      });
    }
  }

  const coilTags = tagsOf(schematic, (s) => (COIL_ELEMENTS as readonly SymbolElement[]).includes(s.element));
  const contactTags = tagsOf(schematic, (s) =>
    (CONTACT_ELEMENTS as readonly SymbolElement[]).includes(s.element) &&
    !(SELF_ACTUATED as readonly SymbolElement[]).includes(s.element),
  );

  for (const tag of coilTags) {
    if (!contactTags.has(tag)) {
      issues.push({ code: 'coil-without-contacts', text: `Cewka ${tag} bez lustra styków`, tag });
    }
  }
  for (const tag of contactTags) {
    if (!coilTags.has(tag)) {
      issues.push({ code: 'contact-without-coil', text: `Styk ${tag} bez cewki`, tag });
    }
  }

  return issues;
};

export interface MatchDifference {
  terminal: TerminalRef;
  inSchematic: TerminalRef[];
  inCabinet: TerminalRef[];
}

const cabinetNetFor = (project: ResolvedProject): {
  netOf: Map<TerminalRef, string>;
  nets: Map<string, TerminalRef[]>;
} => {
  const uf = new UnionFind();
  const pins: TerminalRef[] = [];
  for (const d of project.devices) {
    const sep = d.type.kind === 'terminal' ? '.' : ':';
    for (const t of d.type.terminals) {
      const ref = `${d.instance.tag}${sep}${t.id}`;
      pins.push(ref);
      uf.find(ref);
    }
    for (const [a, b] of d.type.links ?? []) {
      uf.union(`${d.instance.tag}${sep}${a}`, `${d.instance.tag}${sep}${b}`);
    }
  }
  for (const w of project.wires) {
    if (w.fault === 'open') continue;
    uf.union(w.a, w.b);
  }
  const netOf = new Map<TerminalRef, string>();
  const nets = new Map<string, TerminalRef[]>();
  for (const p of pins) {
    const r = uf.find(p);
    netOf.set(p, r);
    const list = nets.get(r);
    if (list) list.push(p);
    else nets.set(r, [p]);
  }
  return { netOf, nets };
};

export const compareSchematicWithCabinet = (
  schematic: Schematic,
  project: ResolvedProject,
): MatchDifference[] => {
  const schNl = buildSchematicNetlist(schematic);
  const cab = cabinetNetFor(project);

  // Zbierz wszystkie TerminalRefy obecne w obu.
  const common: TerminalRef[] = [];
  for (const pin of schNl.pinRoot.keys()) if (cab.netOf.has(pin)) common.push(pin);

  const diffs: MatchDifference[] = [];
  const reported = new Set<string>();
  for (const t of common) {
    const key = `${schNl.pinRoot.get(t)}|${cab.netOf.get(t)}`;
    if (reported.has(key)) continue;
    reported.add(key);

    const schRoot = schNl.pinRoot.get(t)!;
    const schNet = schNl.nets.find((n) => n.id === schRoot)!;
    const schSet = new Set(schNet.pins.filter((p) => cab.netOf.has(p)));

    const cabRoot = cab.netOf.get(t)!;
    const cabSet = new Set((cab.nets.get(cabRoot) ?? []).filter((p) => schNl.netOf.has(p)));

    if (schSet.size === cabSet.size && [...schSet].every((v) => cabSet.has(v))) continue;

    const inSchematic = [...schSet].filter((p) => !cabSet.has(p)).sort();
    const inCabinet = [...cabSet].filter((p) => !schSet.has(p)).sort();
    if (inSchematic.length === 0 && inCabinet.length === 0) continue;
    diffs.push({ terminal: t, inSchematic, inCabinet });
  }
  return diffs;
};
