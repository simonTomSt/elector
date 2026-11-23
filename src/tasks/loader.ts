import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020';
import schemaJson from '../../tasks/task.schema.json';
import type { DeviceLibrary } from './devices';
import type { Project, Schematic, Task } from '@/domain/types';

export class TaskValidationError extends Error {
  readonly issues: string[];
  constructor(message: string, issues: string[]) {
    super(message);
    this.name = 'TaskValidationError';
    this.issues = issues;
  }
}

const buildValidator = (): ValidateFunction => {
  const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
  return ajv.compile(schemaJson);
};

let validator: ValidateFunction | null = null;
const getValidator = (): ValidateFunction => {
  if (!validator) validator = buildValidator();
  return validator;
};

const formatIssue = (err: ErrorObject): string => {
  const path = err.instancePath || '(root)';
  const extra =
    err.keyword === 'enum' && err.params && 'allowedValues' in err.params
      ? ` – dozwolone: ${JSON.stringify((err.params as { allowedValues: unknown }).allowedValues)}`
      : '';
  return `${path} ${err.message ?? ''}${extra}`.trim();
};

export const validateTaskJson = (raw: unknown): void => {
  const v = getValidator();
  if (!v(raw)) {
    const issues = (v.errors ?? []).map(formatIssue);
    throw new TaskValidationError(
      `Zadanie niezgodne ze schematem:\n- ${issues.join('\n- ')}`,
      issues,
    );
  }
};

type TaskRepo = {
  byId: ReadonlyMap<string, unknown>;
};

const mergeProjects = (base: Project | undefined, over: Project | undefined): Project | undefined => {
  if (!base && !over) return undefined;
  const devices = [...(base?.devices ?? []), ...(over?.devices ?? [])];
  const wires = [...(base?.wires ?? []), ...(over?.wires ?? [])];
  return { devices, wires };
};

const mergeSchematics = (
  a: Schematic | undefined,
  b: Schematic | undefined,
): Schematic | undefined => {
  if (!a && !b) return undefined;
  const symbols = [...(a?.symbols ?? []), ...(b?.symbols ?? [])];
  const connections = [...(a?.connections ?? []), ...(b?.connections ?? [])];
  const sheets = a?.sheets ?? b?.sheets;
  const out: Schematic = { symbols, connections };
  if (sheets) out.sheets = sheets;
  return out;
};

const resolveGivenSchematic = (
  raw: unknown,
  repo: TaskRepo | undefined,
): Schematic | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  if ('$ref' in raw) {
    if (!repo) {
      throw new TaskValidationError(
        'givenSchematic używa $ref, ale brak repozytorium zadań do rozwiązania referencji',
        [],
      );
    }
    const refStr = String((raw as { $ref: string }).$ref);
    const [targetId, selector] = refStr.split('#') as [string, string | undefined];
    const target = repo.byId.get(targetId) as Task | undefined;
    if (!target) {
      throw new TaskValidationError(`givenSchematic.$ref: nie znaleziono zadania "${targetId}"`, []);
    }
    const parts = (selector ?? 'givenSchematic').split('+');
    let merged: Schematic | undefined;
    for (const p of parts) {
      const next = (target as unknown as Record<string, unknown>)[p];
      if (next && !('$ref' in (next as object))) {
        merged = mergeSchematics(merged, next as Schematic);
      }
    }
    return merged;
  }
  return raw as Schematic;
};

const applyExtends = (base: Task, over: Task): Task => {
  const overScene = (over.scene ?? {}) as Partial<Task['scene']>;
  const scene: Task['scene'] = { ...base.scene, ...overScene };
  const preset = mergeProjects(base.scene.preset, overScene.preset);
  if (preset) scene.preset = preset;
  else delete scene.preset;

  const merged: Task = { ...base, ...over, scene };
  const solution = mergeProjects(base.solution, over.solution);
  if (solution) merged.solution = solution;
  else delete merged.solution;
  return merged;
};

export interface LoadTaskOptions {
  devices: DeviceLibrary;
  repo?: TaskRepo;
}

const checkTypeIdsExist = (task: Task, devices: DeviceLibrary): void => {
  const sources: Project[] = [];
  if (task.scene.preset) sources.push(task.scene.preset);
  if (task.solution) sources.push(task.solution);
  const missing = new Set<string>();
  for (const src of sources) {
    for (const d of src.devices) {
      if (!devices.byId.has(d.typeId)) missing.add(d.typeId);
    }
  }
  if (task.scene.palette) {
    for (const pid of task.scene.palette) {
      if (!devices.byId.has(pid)) missing.add(pid);
    }
  }
  if (missing.size > 0) {
    const issues = [...missing].map((id) => `nieznany typeId "${id}"`);
    throw new TaskValidationError(
      `Zadanie ${task.id}: ${issues.join(', ')}`,
      issues,
    );
  }
};

export const loadTask = (raw: unknown, opts: LoadTaskOptions): Task => {
  const asRec = (raw ?? {}) as Record<string, unknown>;
  const hasExtends = typeof asRec['extends'] === 'string';
  if (!hasExtends) validateTaskJson(raw);
  let task = raw as Task;

  if (task.extends) {
    if (!opts.repo) {
      throw new TaskValidationError(
        `Zadanie ${task.id}: extends "${task.extends}" wymaga repozytorium zadań`,
        [],
      );
    }
    const base = opts.repo.byId.get(task.extends) as Task | undefined;
    if (!base) {
      throw new TaskValidationError(
        `Zadanie ${task.id}: nie znaleziono bazowego "${task.extends}"`,
        [],
      );
    }
    task = applyExtends(base, task);
    validateTaskJson(task);
  }

  if (task.givenSchematic) {
    const resolved = resolveGivenSchematic(task.givenSchematic, opts.repo);
    if (resolved) task.givenSchematic = resolved;
  }

  checkTypeIdsExist(task, opts.devices);
  return task;
};

export const loadTaskRepo = (
  rawTasks: readonly unknown[],
  devices: DeviceLibrary,
): { tasks: Task[]; byId: Map<string, Task> } => {
  const byId = new Map<string, Task>();
  const bases = new Map<string, unknown>();
  for (const r of rawTasks) {
    if (r && typeof r === 'object' && 'id' in r) {
      bases.set(String((r as { id: unknown }).id), r);
    }
  }
  const repo: TaskRepo = { byId: bases };

  const resolveOrder = [...rawTasks].sort((a, b) => {
    const ae = (a as { extends?: string }).extends ? 1 : 0;
    const be = (b as { extends?: string }).extends ? 1 : 0;
    return ae - be;
  });

  for (const raw of resolveOrder) {
    const task = loadTask(raw, { devices, repo });
    byId.set(task.id, task);
    bases.set(task.id, task);
  }
  return { tasks: [...byId.values()], byId };
};
