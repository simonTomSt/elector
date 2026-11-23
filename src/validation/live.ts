import type {
  Requirement,
  TerminalRef,
  Wire,
  WireColor,
} from '@/domain/types';
import type { ResolvedProject } from '@/sim/model';

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  requirementId: string;
  text: string;
  detail?: string;
  severity: IssueSeverity;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  passed: string[];
}

class UF {
  private p = new Map<string, string>();
  find(x: string): string {
    const v = this.p.get(x);
    if (!v || v === x) {
      if (!v) this.p.set(x, x);
      return x;
    }
    const r = this.find(v);
    this.p.set(x, r);
    return r;
  }
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.p.set(ra, rb);
  }
}

const buildStaticNets = (project: ResolvedProject): UF => {
  const uf = new UF();
  for (const dev of project.devices) {
    if (!dev.type.links) continue;
    for (const [a, b] of dev.type.links) {
      const sep = dev.type.kind === 'terminal' ? '.' : ':';
      uf.union(`${dev.instance.tag}${sep}${a}`, `${dev.instance.tag}${sep}${b}`);
    }
  }
  for (const w of project.wires) {
    if (w.fault === 'open') continue;
    uf.union(w.a, w.b);
  }
  return uf;
};

const tagOf = (ref: TerminalRef): string => {
  const dot = ref.lastIndexOf('.');
  const col = ref.lastIndexOf(':');
  const i = Math.max(dot, col);
  return i > 0 ? ref.slice(0, i) : ref;
};

const terminalIdOf = (ref: TerminalRef): string => {
  const dot = ref.lastIndexOf('.');
  const col = ref.lastIndexOf(':');
  const i = Math.max(dot, col);
  return i > 0 ? ref.slice(i + 1) : ref;
};

const hasInternalPath = (
  project: ResolvedProject,
  a: TerminalRef,
  b: TerminalRef,
): boolean => {
  if (tagOf(a) !== tagOf(b)) return false;
  const dev = project.byTag.get(tagOf(a));
  if (!dev) return false;
  const ta = terminalIdOf(a);
  const tb = terminalIdOf(b);
  for (const [la, lb] of dev.type.links ?? []) {
    if ((la === ta && lb === tb) || (la === tb && lb === ta)) return true;
  }
  for (const c of dev.type.contacts ?? []) {
    if ((c.from === ta && c.to === tb) || (c.from === tb && c.to === ta)) return true;
  }
  return false;
};

const isConnected = (uf: UF, a: TerminalRef, b: TerminalRef): boolean =>
  uf.find(a) === uf.find(b);

const expectedColorFor = (ref: TerminalRef): WireColor | null => {
  const low = ref.toLowerCase();
  if (low.endsWith(':pe') || low.endsWith('.pe') || /:pe(\.|$)/.test(low)) return 'greenYellow';
  if (low.endsWith(':n') || low.endsWith('.n') || /:n(\.|$)/.test(low)) return 'blue';
  if (/:l1(\.|$)/.test(low)) return 'brown';
  if (/:l2(\.|$)/.test(low)) return 'black';
  if (/:l3(\.|$)/.test(low)) return 'grey';
  return null;
};

const checkConnected = (
  req: Requirement,
  uf: UF,
): ValidationIssue | null => {
  const a = req.args?.['a'] as TerminalRef | undefined;
  const b = req.args?.['b'] as TerminalRef | undefined;
  if (!a || !b) return null;
  if (isConnected(uf, a, b)) return null;
  return {
    requirementId: req.id,
    text: req.text,
    detail: `Brak połączenia ${a} ↔ ${b}`,
    severity: 'error',
  };
};

const checkInSeries = (
  req: Requirement,
  project: ResolvedProject,
  uf: UF,
): ValidationIssue | null => {
  const path = req.args?.['path'] as TerminalRef[] | undefined;
  if (!path || path.length < 2) return null;
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i];
    const b = path[i + 1];
    if (!a || !b) continue;
    if (hasInternalPath(project, a, b)) continue;
    if (!isConnected(uf, a, b)) {
      return {
        requirementId: req.id,
        text: req.text,
        detail: `Brak połączenia ${a} ↔ ${b}`,
        severity: 'error',
      };
    }
  }
  return null;
};

const checkParallel = (
  req: Requirement,
  project: ResolvedProject,
  uf: UF,
): ValidationIssue | null => {
  const a = req.args?.['a'] as TerminalRef | undefined;
  const b = req.args?.['b'] as TerminalRef | undefined;
  const withRef = req.args?.['with'] as string | undefined;
  if (!a || !b || !withRef) return null;
  const [tag, pins] = withRef.split(':');
  if (!tag || !pins) return null;
  const [p1, p2] = pins.split('-');
  if (!p1 || !p2) return null;
  const dev = project.byTag.get(tag);
  if (!dev) {
    return {
      requirementId: req.id,
      text: req.text,
      detail: `Brak aparatu ${tag}`,
      severity: 'error',
    };
  }
  const t1 = `${tag}:${p1}`;
  const t2 = `${tag}:${p2}`;
  const branchAB = isConnected(uf, a, t1) && isConnected(uf, b, t2);
  const branchBA = isConnected(uf, a, t2) && isConnected(uf, b, t1);
  if (!branchAB && !branchBA) {
    return {
      requirementId: req.id,
      text: req.text,
      detail: `Brak równoległej gałęzi przez ${withRef}`,
      severity: 'error',
    };
  }
  return null;
};

const checkDeviceExists = (
  req: Requirement,
  project: ResolvedProject,
): ValidationIssue | null => {
  const tag = req.args?.['tag'] as string | undefined;
  const typeKind = req.args?.['typeKind'] as string | undefined;
  if (!tag) return null;
  const dev = project.byTag.get(tag);
  if (!dev) {
    return {
      requirementId: req.id,
      text: req.text,
      detail: `Brak aparatu ${tag}`,
      severity: 'error',
    };
  }
  if (typeKind && dev.type.kind !== typeKind) {
    return {
      requirementId: req.id,
      text: req.text,
      detail: `${tag} nie jest typu ${typeKind}`,
      severity: 'error',
    };
  }
  return null;
};

const checkSetting = (
  req: Requirement,
  project: ResolvedProject,
): ValidationIssue | null => {
  const tag = req.args?.['tag'] as string | undefined;
  const param = req.args?.['param'] as string | undefined;
  const min = req.args?.['min'] as number | undefined;
  const max = req.args?.['max'] as number | undefined;
  if (!tag || !param) return null;
  const dev = project.byTag.get(tag);
  if (!dev) {
    return {
      requirementId: req.id,
      text: req.text,
      detail: `Brak aparatu ${tag}`,
      severity: 'error',
    };
  }
  const value = (dev.instance.params?.[param] ?? dev.type.params[param]) as number | undefined;
  if (typeof value !== 'number') {
    return {
      requirementId: req.id,
      text: req.text,
      detail: `Nastawa ${tag}.${param}: brak wartości`,
      severity: 'error',
    };
  }
  if (typeof min === 'number' && value < min) {
    return {
      requirementId: req.id,
      text: req.text,
      detail: `Nastawa ${tag}: ${value} poniżej ${min}`,
      severity: 'warning',
    };
  }
  if (typeof max === 'number' && value > max) {
    return {
      requirementId: req.id,
      text: req.text,
      detail: `Nastawa ${tag}: ${value} > Iₙ ${max}`,
      severity: 'warning',
    };
  }
  return null;
};

const checkWireColors = (
  req: Requirement,
  project: ResolvedProject,
): ValidationIssue | null => {
  const bad: Wire[] = [];
  for (const w of project.wires) {
    const expA = expectedColorFor(w.a);
    const expB = expectedColorFor(w.b);
    const exp = expA ?? expB;
    if (!exp) continue;
    if (w.color !== exp) bad.push(w);
  }
  if (bad.length === 0) return null;
  const first = bad[0]!;
  return {
    requirementId: req.id,
    text: req.text,
    detail: `Przewód ${first.id} (${first.a} ↔ ${first.b}) w złym kolorze`,
    severity: 'error',
  };
};

export const validateLive = (
  requirements: readonly Requirement[],
  project: ResolvedProject,
): ValidationResult => {
  const uf = buildStaticNets(project);
  const issues: ValidationIssue[] = [];
  const passed: string[] = [];

  for (const req of requirements) {
    let issue: ValidationIssue | null = null;
    switch (req.check) {
      case 'deviceExists':
        issue = checkDeviceExists(req, project);
        break;
      case 'connected':
        issue = checkConnected(req, uf);
        break;
      case 'inSeries':
        issue = checkInSeries(req, project, uf);
        break;
      case 'parallel':
        issue = checkParallel(req, project, uf);
        break;
      case 'wireColors':
        issue = checkWireColors(req, project);
        break;
      case 'setting':
        issue = checkSetting(req, project);
        break;
      default:
        issue = null;
    }
    if (issue) issues.push(issue);
    else passed.push(req.id);
  }

  return { issues, passed };
};
