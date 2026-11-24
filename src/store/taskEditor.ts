import { create } from 'zustand';
import type {
  Fault,
  Hint,
  HintLevel,
  SceneStart,
  Task,
  TaskLevel,
  TestScenario,
} from '@/domain/types';
import { validateTaskJson, TaskValidationError } from '@/tasks/loader';
import dol4kwRaw from '../../tasks/examples/dol-4kw.json';

export type VariableToken = '{moc}' | '{In}' | '{Uster}';

export const VARIABLE_TOKENS: readonly VariableToken[] = ['{moc}', '{In}', '{Uster}'];

/** Katalog mocy silnika z tabelą prądu znamionowego – zgodnie z makietą EdytorZadan.dc.html. */
export const POWER_CATALOG: readonly { key: string; label: string; In: number }[] = [
  { key: '2,2', label: '2,2 kW', In: 4.9 },
  { key: '3', label: '3 kW', In: 6.5 },
  { key: '4', label: '4 kW', In: 8.2 },
  { key: '5,5', label: '5,5 kW', In: 11.1 },
  { key: '7,5', label: '7,5 kW', In: 15.2 },
];

export const CONTROL_VOLTAGES: readonly string[] = ['24 V DC', '230 V AC', 'losowo'];

export const HINT_LEVELS: readonly { value: HintLevel; label: string }[] = [
  { value: 'subtelna', label: 'subtelna' },
  { value: 'bezpośrednia', label: 'bezpośrednia' },
  { value: 'rozwiązanie', label: 'rozwiązanie' },
];

export type ImportResult =
  | { ok: true }
  | { ok: false; issues: string[] };

export type ExportResult = { json: string };

const DRAFT_DEFAULTS: Task = dol4kwRaw as unknown as Task;

interface TaskEditorState {
  draft: Task;
  savedAt: number | null;
  recording: boolean;
  importError: string | null;

  reset(): void;
  loadFromJson(json: string): ImportResult;
  loadTask(task: Task): void;
  toJson(): string;

  setTitle(value: string): void;
  setStatement(value: string): void;
  setLevel(level: TaskLevel | null): void;
  setDurationMin(min: number | null): void;
  insertVariableToField(field: 'title' | 'statement', token: VariableToken): void;

  setSceneStart(start: SceneStart): void;

  togglePower(key: string): void;
  setPowerChoices(keys: string[]): void;
  setControlVoltage(uster: string): void;

  addScenario(): void;
  removeScenario(id: string): void;
  renameScenario(id: string, name: string): void;
  setScenarioSteps(id: string, stepsJson: string): { ok: true } | { ok: false; error: string };

  toggleFault(id: string): void;
  addFault(fault: Fault): void;
  removeFault(id: string): void;
  setPickFaults(n: number | null): void;

  addHint(): void;
  updateHint(id: string, patch: Partial<Omit<Hint, 'id'>>): void;
  removeHint(id: string): void;

  setRecording(on: boolean): void;
}

const cloneTask = (task: Task): Task => JSON.parse(JSON.stringify(task)) as Task;

const ustersFrom = (task: Task): string[] => {
  const p = task.params?.['Uster'];
  if (!p) return ['24 V DC'];
  return (p.choices as unknown[]).map((c) => String(c));
};

const powerKeysFrom = (task: Task): string[] => {
  const p = task.params?.['moc'];
  if (!p) return [];
  return (p.choices as unknown[]).map((c) => {
    const s = String(c);
    // "4 kW" → "4"
    const trimmed = s.replace(/\s*kW$/i, '').trim();
    return trimmed;
  });
};

const setPowerChoicesIn = (task: Task, keys: string[]): Task => {
  const chosen = POWER_CATALOG.filter((p) => keys.includes(p.key));
  const choices = chosen.map((p) => p.label);
  const derive: Record<string, unknown> = {};
  for (const p of chosen) {
    const In = `${p.In.toFixed(1).replace('.', ',')} A`;
    derive[p.label] = { In, '-M1.params': { Pn: Math.round(p.In * 400 * 1.73) * 1, In: p.In } };
  }
  const next = { ...task };
  next.params = { ...(task.params ?? {}) };
  next.params['moc'] = { choices, derive };
  return next;
};

const setUsterIn = (task: Task, uster: string): Task => {
  const next = { ...task };
  next.params = { ...(task.params ?? {}) };
  next.params['Uster'] = { choices: [uster] };
  return next;
};

const insertAtEnd = (text: string, token: string): string =>
  text.length === 0 ? token : `${text} ${token}`;

/** Niskopoziomowa walidacja JSON kroku scenariusza wobec schematu `step`. */
export const parseScenarioSteps = (
  json: string,
): { ok: true; steps: TestScenario['steps'] } | { ok: false; error: string } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: `Niepoprawny JSON: ${(e as Error).message}` };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: 'Kroki muszą być tablicą obiektów.' };
  }
  const ALLOWED_DO = new Set(['set', 'press', 'release', 'wait', 'measure', 'lock', 'unlock']);
  const steps: TestScenario['steps'] = [];
  for (let i = 0; i < parsed.length; i += 1) {
    const step = parsed[i];
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      return { ok: false, error: `Krok ${i + 1}: oczekiwany obiekt.` };
    }
    const s = step as Record<string, unknown>;
    if (s['do'] !== undefined && typeof s['do'] === 'string' && !ALLOWED_DO.has(s['do'])) {
      return { ok: false, error: `Krok ${i + 1}: nieznane do="${String(s['do'])}".` };
    }
    steps.push(s as TestScenario['steps'][number]);
  }
  return { ok: true, steps };
};

export const useTaskEditorStore = create<TaskEditorState>((set, get) => ({
  draft: cloneTask(DRAFT_DEFAULTS),
  savedAt: null,
  recording: false,
  importError: null,

  reset() {
    set({ draft: cloneTask(DRAFT_DEFAULTS), savedAt: null, importError: null, recording: false });
  },

  loadFromJson(json) {
    try {
      const raw = JSON.parse(json) as unknown;
      validateTaskJson(raw);
      set({ draft: cloneTask(raw as Task), savedAt: Date.now(), importError: null });
      return { ok: true };
    } catch (e) {
      if (e instanceof TaskValidationError) {
        set({ importError: e.issues.join('; ') });
        return { ok: false, issues: e.issues };
      }
      const msg = (e as Error).message || 'Nieznany błąd';
      set({ importError: msg });
      return { ok: false, issues: [msg] };
    }
  },

  loadTask(task) {
    set({ draft: cloneTask(task), savedAt: Date.now(), importError: null });
  },

  toJson() {
    return JSON.stringify(get().draft, null, 2);
  },

  setTitle(value) {
    set((s) => ({ draft: { ...s.draft, title: value }, savedAt: Date.now() }));
  },

  setStatement(value) {
    set((s) => ({ draft: { ...s.draft, statement: value }, savedAt: Date.now() }));
  },

  setLevel(level) {
    set((s) => {
      const next = { ...s.draft };
      if (level) next.level = level;
      else delete next.level;
      return { draft: next, savedAt: Date.now() };
    });
  },

  setDurationMin(min) {
    set((s) => {
      const next = { ...s.draft };
      if (typeof min === 'number' && min > 0) next.durationMin = min;
      else delete next.durationMin;
      return { draft: next, savedAt: Date.now() };
    });
  },

  insertVariableToField(field, token) {
    set((s) => ({
      draft: { ...s.draft, [field]: insertAtEnd(s.draft[field] ?? '', token) },
      savedAt: Date.now(),
    }));
  },

  setSceneStart(start) {
    set((s) => ({
      draft: { ...s.draft, scene: { ...s.draft.scene, start } },
      savedAt: Date.now(),
    }));
  },

  togglePower(key) {
    const current = new Set(powerKeysFrom(get().draft));
    if (current.has(key)) current.delete(key);
    else current.add(key);
    set({
      draft: setPowerChoicesIn(get().draft, [...current]),
      savedAt: Date.now(),
    });
  },

  setPowerChoices(keys) {
    set({ draft: setPowerChoicesIn(get().draft, keys), savedAt: Date.now() });
  },

  setControlVoltage(uster) {
    set({ draft: setUsterIn(get().draft, uster), savedAt: Date.now() });
  },

  addScenario() {
    set((s) => {
      const existing = s.draft.testScenarios ?? [];
      const used = new Set(existing.map((x) => x.id));
      let n = existing.length + 1;
      let id = `scen-${n}`;
      while (used.has(id)) {
        n += 1;
        id = `scen-${n}`;
      }
      const scen: TestScenario = { id, name: `Nowy scenariusz ${n}`, steps: [] };
      return {
        draft: { ...s.draft, testScenarios: [...existing, scen] },
        savedAt: Date.now(),
      };
    });
  },

  removeScenario(id) {
    set((s) => ({
      draft: {
        ...s.draft,
        testScenarios: (s.draft.testScenarios ?? []).filter((x) => x.id !== id),
      },
      savedAt: Date.now(),
    }));
  },

  renameScenario(id, name) {
    set((s) => ({
      draft: {
        ...s.draft,
        testScenarios: (s.draft.testScenarios ?? []).map((x) =>
          x.id === id ? { ...x, name } : x,
        ),
      },
      savedAt: Date.now(),
    }));
  },

  setScenarioSteps(id, stepsJson) {
    const parsed = parseScenarioSteps(stepsJson);
    if (!parsed.ok) return parsed;
    set((s) => ({
      draft: {
        ...s.draft,
        testScenarios: (s.draft.testScenarios ?? []).map((x) =>
          x.id === id ? { ...x, steps: parsed.steps } : x,
        ),
      },
      savedAt: Date.now(),
    }));
    return { ok: true };
  },

  toggleFault(id) {
    set((s) => {
      const list = s.draft.faults ?? [];
      const exists = list.some((f) => f.id === id);
      if (exists) {
        return {
          draft: { ...s.draft, faults: list.filter((f) => f.id !== id) },
          savedAt: Date.now(),
        };
      }
      // Jeżeli nie ma – brak możliwości dodania samej flagi; wywołujący powinien użyć addFault.
      return {};
    });
  },

  addFault(fault) {
    set((s) => {
      const list = s.draft.faults ?? [];
      if (list.some((f) => f.id === fault.id)) return {};
      return {
        draft: { ...s.draft, faults: [...list, fault] },
        savedAt: Date.now(),
      };
    });
  },

  removeFault(id) {
    set((s) => ({
      draft: { ...s.draft, faults: (s.draft.faults ?? []).filter((f) => f.id !== id) },
      savedAt: Date.now(),
    }));
  },

  setPickFaults(n) {
    set((s) => {
      const next = { ...s.draft };
      if (typeof n === 'number' && n > 0) next.pickFaults = n;
      else delete next.pickFaults;
      return { draft: next, savedAt: Date.now() };
    });
  },

  addHint() {
    set((s) => {
      const existing = s.draft.hints ?? [];
      const used = new Set(existing.map((h) => h.id));
      let n = existing.length + 1;
      let id = `h${n}`;
      while (used.has(id)) {
        n += 1;
        id = `h${n}`;
      }
      const hint: Hint = { id, text: '', level: 'subtelna' };
      return {
        draft: { ...s.draft, hints: [...existing, hint] },
        savedAt: Date.now(),
      };
    });
  },

  updateHint(id, patch) {
    set((s) => ({
      draft: {
        ...s.draft,
        hints: (s.draft.hints ?? []).map((h) => (h.id === id ? { ...h, ...patch } : h)),
      },
      savedAt: Date.now(),
    }));
  },

  removeHint(id) {
    set((s) => ({
      draft: {
        ...s.draft,
        hints: (s.draft.hints ?? []).filter((h) => h.id !== id),
      },
      savedAt: Date.now(),
    }));
  },

  setRecording(on) {
    set({ recording: on });
  },
}));

export const selectPowerKeys = (task: Task): string[] => powerKeysFrom(task);
export const selectUsters = (task: Task): string[] => ustersFrom(task);
