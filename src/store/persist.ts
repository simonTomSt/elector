import type { DeviceInstance, Wire } from '@/domain/types';
import type { MainView } from '@/store/ui';
import type { ThemeName } from '@/ui/theme/tokens';

export const CURRENT_SCHEMA_VERSION = 1;

const KEY_PROJECT_PREFIX = 'elector:project:';
const KEY_UI = 'elector:ui';
const KEY_PROGRESS = 'elector:progress';
const APP_MARKER = 'elector';

export type TaskProgressStatus = 'nie-zaczete' | 'w-toku' | 'ukonczone';

export interface PersistedProject {
  devices: DeviceInstance[];
  wires: Wire[];
}

export interface PersistedUi {
  theme: ThemeName;
  view: MainView;
  currentTaskId: string | null;
}

export interface TaskProgressEntry {
  status: TaskProgressStatus;
  updatedAt: number;
  score?: number;
  completedAt?: number;
}

export type Progress = Record<string, TaskProgressEntry>;

interface Envelope<T> {
  schemaVersion: number;
  payload: T;
}

const hasStorage = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

const readEnvelope = <T>(key: string, validate: (p: unknown) => p is T): T | null => {
  if (!hasStorage()) return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const env = parsed as { schemaVersion?: unknown; payload?: unknown };
    if (env.schemaVersion !== CURRENT_SCHEMA_VERSION) return null;
    if (!validate(env.payload)) return null;
    return env.payload;
  } catch {
    return null;
  }
};

const writeEnvelope = <T>(key: string, payload: T): void => {
  if (!hasStorage()) return;
  const env: Envelope<T> = { schemaVersion: CURRENT_SCHEMA_VERSION, payload };
  window.localStorage.setItem(key, JSON.stringify(env));
};

const isProject = (p: unknown): p is PersistedProject => {
  if (!p || typeof p !== 'object') return false;
  const o = p as { devices?: unknown; wires?: unknown };
  return Array.isArray(o.devices) && Array.isArray(o.wires);
};

const isUi = (p: unknown): p is PersistedUi => {
  if (!p || typeof p !== 'object') return false;
  const o = p as { theme?: unknown; view?: unknown; currentTaskId?: unknown };
  const themeOk = o.theme === 'dark' || o.theme === 'light';
  const viewOk =
    o.view === 'cabinet' ||
    o.view === 'schematic' ||
    o.view === 'mixed' ||
    o.view === 'editor' ||
    o.view === 'tasks';
  const taskOk = o.currentTaskId === null || typeof o.currentTaskId === 'string';
  return themeOk && viewOk && taskOk;
};

const isProgress = (p: unknown): p is Progress => {
  if (!p || typeof p !== 'object') return false;
  for (const v of Object.values(p as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') return false;
    const e = v as { status?: unknown; updatedAt?: unknown };
    const statusOk = e.status === 'nie-zaczete' || e.status === 'w-toku' || e.status === 'ukonczone';
    if (!statusOk || typeof e.updatedAt !== 'number') return false;
    const ev = v as { score?: unknown; completedAt?: unknown };
    if (ev.score !== undefined && typeof ev.score !== 'number') return false;
    if (ev.completedAt !== undefined && typeof ev.completedAt !== 'number') return false;
  }
  return true;
};

export const saveProject = (taskId: string, project: PersistedProject): void => {
  writeEnvelope(`${KEY_PROJECT_PREFIX}${taskId}`, project);
};

export const loadProject = (taskId: string): PersistedProject | null =>
  readEnvelope(`${KEY_PROJECT_PREFIX}${taskId}`, isProject);

export const clearProject = (taskId: string): void => {
  if (!hasStorage()) return;
  window.localStorage.removeItem(`${KEY_PROJECT_PREFIX}${taskId}`);
};

export const saveUi = (ui: PersistedUi): void => writeEnvelope(KEY_UI, ui);
export const loadUi = (): PersistedUi | null => readEnvelope(KEY_UI, isUi);

export const saveProgress = (progress: Progress): void => writeEnvelope(KEY_PROGRESS, progress);
export const loadProgress = (): Progress => readEnvelope(KEY_PROGRESS, isProgress) ?? {};

export const listProjectTaskIds = (): string[] => {
  if (!hasStorage()) return [];
  const out: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(KEY_PROJECT_PREFIX)) out.push(k.slice(KEY_PROJECT_PREFIX.length));
  }
  return out;
};

interface Snapshot {
  app: typeof APP_MARKER;
  schemaVersion: number;
  projects: Record<string, PersistedProject>;
  ui: PersistedUi | null;
  progress: Progress;
}

export const exportSnapshot = (): string => {
  const projects: Record<string, PersistedProject> = {};
  for (const id of listProjectTaskIds()) {
    const p = loadProject(id);
    if (p) projects[id] = p;
  }
  const snap: Snapshot = {
    app: APP_MARKER,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    projects,
    ui: loadUi(),
    progress: loadProgress(),
  };
  return JSON.stringify(snap);
};

export const importSnapshot = (raw: string): boolean => {
  if (!hasStorage()) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== 'object') return false;
  const s = parsed as Partial<Snapshot>;
  if (s.app !== APP_MARKER) return false;
  if (s.schemaVersion !== CURRENT_SCHEMA_VERSION) return false;
  if (!s.projects || typeof s.projects !== 'object') return false;

  clearAll();
  for (const [id, proj] of Object.entries(s.projects)) {
    if (isProject(proj)) saveProject(id, proj);
  }
  if (s.ui && isUi(s.ui)) saveUi(s.ui);
  if (s.progress && isProgress(s.progress)) saveProgress(s.progress);
  return true;
};

export const clearAll = (): void => {
  if (!hasStorage()) return;
  const toRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i);
    if (!k) continue;
    if (k.startsWith(KEY_PROJECT_PREFIX) || k === KEY_UI || k === KEY_PROGRESS) {
      toRemove.push(k);
    }
  }
  for (const k of toRemove) window.localStorage.removeItem(k);
};
