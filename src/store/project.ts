import { create } from 'zustand';
import type { DeviceInstance, Project, Task, Wire } from '@/domain/types';
import type { DeviceLibrary } from '@/tasks/devices';
import { buildProjectFromTask, resolveProject, type ResolvedProject } from '@/sim/model';

export type RailIndex = 1 | 2;

export interface RailPlacementRaw {
  rail: RailIndex;
  xMm: number;
}

export type DeviceInstanceRail = DeviceInstance & RailPlacementRaw;

const GRID_MM = 9;

export const snapToGrid = (xMm: number, gridMm: number = GRID_MM): number =>
  Math.round(xMm / gridMm) * gridMm;

export interface ViewState {
  zoom: number;
  panXPx: number;
  panYPx: number;
}

interface ProjectState {
  task: Task;
  library: DeviceLibrary;
  devices: DeviceInstance[];
  wires: Wire[];
  selectedTag: string | null;
  view: ViewState;
  init(task: Task, library: DeviceLibrary): void;
  addDeviceOnRail(typeId: string, rail: RailIndex, xMm: number): string | null;
  moveDevice(tag: string, xMm: number): void;
  removeDevice(tag: string): void;
  selectDevice(tag: string | null): void;
  setZoom(zoom: number): void;
  setPan(xPx: number, yPx: number): void;
  resetView(): void;
}

const railPlacementOf = (d: DeviceInstance): RailPlacementRaw | null => {
  const raw = d as unknown as { rail?: unknown; xMm?: unknown };
  if ((raw.rail === 1 || raw.rail === 2) && typeof raw.xMm === 'number') {
    return { rail: raw.rail, xMm: raw.xMm };
  }
  return null;
};

const widthMmFor = (library: DeviceLibrary, typeId: string): number =>
  library.byId.get(typeId)?.widthMm ?? 0;

const prefixFor = (library: DeviceLibrary, typeId: string): string =>
  library.byId.get(typeId)?.prefix ?? '-X';

export const nextTagFor = (
  library: DeviceLibrary,
  typeId: string,
  existing: readonly DeviceInstance[],
): string => {
  const prefix = prefixFor(library, typeId);
  const used = new Set<number>();
  for (const d of existing) {
    if (!d.tag.startsWith(prefix)) continue;
    const rest = d.tag.slice(prefix.length);
    const m = /^(\d+)/.exec(rest);
    if (m && m[1]) used.add(Number(m[1]));
  }
  let n = 1;
  while (used.has(n)) n += 1;
  return `${prefix}${n}`;
};

export interface Occupant {
  tag: string;
  x0: number;
  x1: number;
}

export const railOccupants = (
  library: DeviceLibrary,
  devices: readonly DeviceInstance[],
  rail: RailIndex,
  excludeTag?: string,
): Occupant[] => {
  const result: Occupant[] = [];
  for (const d of devices) {
    if (d.tag === excludeTag) continue;
    const p = railPlacementOf(d);
    if (!p || p.rail !== rail) continue;
    const w = widthMmFor(library, d.typeId);
    if (w <= 0) continue;
    result.push({ tag: d.tag, x0: p.xMm, x1: p.xMm + w });
  }
  return result.sort((a, b) => a.x0 - b.x0);
};

export const collides = (
  x0: number,
  x1: number,
  occupants: readonly Occupant[],
): boolean => occupants.some((o) => x0 < o.x1 && x1 > o.x0);

export const fitsOnRail = (
  x0: number,
  widthMm: number,
  railLengthMm: number,
  plateStartXMm = 0,
): boolean => x0 >= plateStartXMm && x0 + widthMm <= plateStartXMm + railLengthMm;

const cloneDevices = (ds: readonly DeviceInstance[]): DeviceInstance[] => ds.map((d) => ({ ...d }));

export const projectFromState = (state: Pick<ProjectState, 'devices' | 'wires'>): Project => ({
  devices: state.devices,
  wires: state.wires,
});

export const resolveState = (
  state: Pick<ProjectState, 'devices' | 'wires' | 'library'>,
): ResolvedProject => resolveProject(projectFromState(state), state.library);

export const useProjectStore = create<ProjectState>((set, get) => ({
  task: null as unknown as Task,
  library: null as unknown as DeviceLibrary,
  devices: [],
  wires: [],
  selectedTag: null,
  view: { zoom: 1, panXPx: 0, panYPx: 0 },

  init(task, library) {
    const project = buildProjectFromTask(task);
    set({
      task,
      library,
      devices: cloneDevices(project.devices),
      wires: [...project.wires],
      selectedTag: null,
      view: { zoom: 1, panXPx: 0, panYPx: 0 },
    });
  },

  addDeviceOnRail(typeId, rail, xMm) {
    const { library, devices, task } = get();
    const w = widthMmFor(library, typeId);
    if (w <= 0) return null;
    const snapped = snapToGrid(xMm);
    const railLen = task.scene.rails?.[rail - 1]?.lengthMm ?? 0;
    if (!fitsOnRail(snapped, w, railLen)) return null;
    const occ = railOccupants(library, devices, rail);
    if (collides(snapped, snapped + w, occ)) return null;
    const tag = nextTagFor(library, typeId, devices);
    const inst: DeviceInstanceRail = { tag, typeId, rail, xMm: snapped };
    set({ devices: [...devices, inst], selectedTag: tag });
    return tag;
  },

  moveDevice(tag, xMm) {
    const { library, devices, task } = get();
    const idx = devices.findIndex((d) => d.tag === tag);
    if (idx < 0) return;
    const current = devices[idx];
    if (!current) return;
    const p = railPlacementOf(current);
    if (!p) return;
    const w = widthMmFor(library, current.typeId);
    const snapped = snapToGrid(xMm);
    const railLen = task.scene.rails?.[p.rail - 1]?.lengthMm ?? 0;
    if (!fitsOnRail(snapped, w, railLen)) return;
    const occ = railOccupants(library, devices, p.rail, tag);
    if (collides(snapped, snapped + w, occ)) return;
    const updated: DeviceInstanceRail = { ...current, rail: p.rail, xMm: snapped };
    const next = devices.slice();
    next[idx] = updated;
    set({ devices: next });
  },

  removeDevice(tag) {
    const { devices, wires, selectedTag } = get();
    const next = devices.filter((d) => d.tag !== tag);
    if (next.length === devices.length) return;
    const nextWires = wires.filter(
      (w) => !w.a.startsWith(`${tag}:`) && !w.b.startsWith(`${tag}:`),
    );
    set({
      devices: next,
      wires: nextWires,
      selectedTag: selectedTag === tag ? null : selectedTag,
    });
  },

  selectDevice(tag) {
    set({ selectedTag: tag });
  },

  setZoom(zoom) {
    const z = Math.max(0.5, Math.min(3, zoom));
    set((s) => ({ view: { ...s.view, zoom: z } }));
  },

  setPan(xPx, yPx) {
    set((s) => ({ view: { ...s.view, panXPx: xPx, panYPx: yPx } }));
  },

  resetView() {
    set({ view: { zoom: 1, panXPx: 0, panYPx: 0 } });
  },
}));
