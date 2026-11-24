import type {
  DeviceInstance,
  DeviceType,
  Project,
  Task,
  TerminalRef,
  Wire,
} from '@/domain/types';
import type { DeviceLibrary } from '@/tasks/devices';

export interface ResolvedDevice {
  instance: DeviceInstance;
  type: DeviceType;
  terminalRefs: TerminalRef[];
}

export interface ResolvedProject {
  devices: ResolvedDevice[];
  wires: Wire[];
  byTag: ReadonlyMap<string, ResolvedDevice>;
  terminalIndex: ReadonlyMap<TerminalRef, { tag: string; terminal: string }>;
}

const isTerminalKind = (type: DeviceType): boolean => type.kind === 'terminal';

export const terminalRef = (type: DeviceType, tag: string, terminalId: string): TerminalRef => {
  const sep = isTerminalKind(type) ? '.' : ':';
  return `${tag}${sep}${terminalId}`;
};

export const splitTerminalRef = (
  ref: TerminalRef,
  byTag: ReadonlyMap<string, ResolvedDevice>,
): { tag: string; terminal: string } | undefined => {
  const dotIdx = ref.lastIndexOf('.');
  if (dotIdx > 0) {
    const tag = ref.slice(0, dotIdx);
    const term = ref.slice(dotIdx + 1);
    if (byTag.has(tag)) return { tag, terminal: term };
  }
  const colonIdx = ref.lastIndexOf(':');
  if (colonIdx > 0) {
    const tag = ref.slice(0, colonIdx);
    const term = ref.slice(colonIdx + 1);
    if (byTag.has(tag)) return { tag, terminal: term };
  }
  return undefined;
};

const mergeProject = (a?: Project, b?: Project): Project => ({
  devices: [...(a?.devices ?? []), ...(b?.devices ?? [])],
  wires: [...(a?.wires ?? []), ...(b?.wires ?? [])],
});

export const buildProjectFromTask = (task: Task): Project =>
  mergeProject(task.scene.preset, task.solution);

/**
 * Stan startowy sceny dla kursanta — tylko to, co ma być od początku
 * (preset: zasilanie, drzwi, listwy, złączki). Solution jest celem,
 * nie punktem startu.
 */
export const buildInitialProjectForEditor = (task: Task): Project => ({
  devices: [...(task.scene.preset?.devices ?? [])],
  wires: [...(task.scene.preset?.wires ?? [])],
});

export const resolveProject = (project: Project, devices: DeviceLibrary): ResolvedProject => {
  const byTag = new Map<string, ResolvedDevice>();
  const resolved: ResolvedDevice[] = [];
  const terminalIndex = new Map<TerminalRef, { tag: string; terminal: string }>();

  for (const instance of project.devices) {
    const type = devices.byId.get(instance.typeId);
    if (!type) {
      throw new Error(`resolveProject: nieznany typeId "${instance.typeId}" dla ${instance.tag}`);
    }
    if (byTag.has(instance.tag)) {
      throw new Error(`resolveProject: duplikat tag "${instance.tag}"`);
    }
    const refs = type.terminals.map((t) => terminalRef(type, instance.tag, t.id));
    const rd: ResolvedDevice = { instance, type, terminalRefs: refs };
    byTag.set(instance.tag, rd);
    resolved.push(rd);
    for (const r of refs) {
      const parsed = { tag: instance.tag, terminal: r.slice(instance.tag.length + 1) };
      terminalIndex.set(r, parsed);
    }
  }

  return { devices: resolved, wires: project.wires, byTag, terminalIndex };
};
