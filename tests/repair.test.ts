import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTaskRepo } from '@/tasks/loader';
import type { Task } from '@/domain/types';
import { useDiagnosticStore } from '@/store/diagnostic';
import { useProjectStore } from '@/store/project';
import { loadProject } from '@/store/persist';

const here = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.resolve(here, '..', 'tasks', 'examples');

const readRaw = (name: string): unknown =>
  JSON.parse(readFileSync(path.join(examplesDir, name), 'utf8')) as unknown;

const loadDiag = (): { task: Task; library: ReturnType<typeof loadDeviceLibrary> } => {
  const library = loadDeviceLibrary();
  const base = readRaw('dol-4kw.json');
  const diag = readRaw('diag-no-start.json');
  const { byId } = loadTaskRepo([base, diag], library);
  const task = byId.get('diag-no-start');
  if (!task) throw new Error('nie wczytano diag-no-start');
  return { task, library };
};

const resetAll = (): void => {
  // Kolejność: najpierw task=null (żeby subskrybenci diag nie zapisywali
  // do taskId ze starego testu), potem reset diag, potem wyczyszczenie storage.
  useProjectStore.setState({
    task: null as never,
    library: null as never,
    devices: [],
    wires: [],
    selectedTag: null,
    selectedWireId: null,
    draft: null,
  });
  useDiagnosticStore.getState().reset();
  window.localStorage.clear();
};

describe('M29 – naprawa przewodu usuwa fault z silnika', () => {
  beforeEach(resetAll);
  afterEach(resetAll);

  it('repairFault usuwa wire.fault z przewodu', () => {
    const { task, library } = loadDiag();
    useDiagnosticStore.getState().hydrate({ assignedFaultIds: ['f-open-c4'] });
    useProjectStore.getState().init(task, library);
    const beforeC4 = useProjectStore.getState().wires.find((w) => w.id === 'C4');
    expect(beforeC4?.fault).toBe('open');

    useProjectStore.getState().repairFault('f-open-c4');

    const afterC4 = useProjectStore.getState().wires.find((w) => w.id === 'C4');
    expect(afterC4?.fault).toBeUndefined();
    expect(useDiagnosticStore.getState().repairedFaultIds).toContain('f-open-c4');
  });

  it('repairFault na nieznanym id nic nie robi', () => {
    const { task, library } = loadDiag();
    useDiagnosticStore.getState().hydrate({ assignedFaultIds: ['f-open-c4'] });
    useProjectStore.getState().init(task, library);
    useProjectStore.getState().repairFault('nieistnieje');
    expect(useDiagnosticStore.getState().repairedFaultIds).toEqual([]);
    const c4 = useProjectStore.getState().wires.find((w) => w.id === 'C4');
    expect(c4?.fault).toBe('open');
  });

  it('repairFault na nienaprzyznanym id nic nie robi', () => {
    const { task, library } = loadDiag();
    useDiagnosticStore.getState().hydrate({ assignedFaultIds: ['f-open-c4'] });
    useProjectStore.getState().init(task, library);
    useProjectStore.getState().repairFault('f-coil');
    expect(useDiagnosticStore.getState().repairedFaultIds).toEqual([]);
  });

  it('po repair applyAssignedFaults nie przywraca faulta', () => {
    const { task, library } = loadDiag();
    useDiagnosticStore.getState().hydrate({ assignedFaultIds: ['f-open-c4'] });
    useProjectStore.getState().init(task, library);
    useProjectStore.getState().repairFault('f-open-c4');
    useProjectStore.getState().applyAssignedFaults();
    const c4 = useProjectStore.getState().wires.find((w) => w.id === 'C4');
    expect(c4?.fault).toBeUndefined();
  });

  it('deviceFaultStates pomija naprawione faulty', () => {
    const { task } = loadDiag();
    useDiagnosticStore.getState().hydrate({ assignedFaultIds: ['f-coil'] });
    const before = useDiagnosticStore.getState().deviceFaultStates(task);
    expect(before['-K1']?.coilOpen).toBe(true);

    useDiagnosticStore.getState().repair('f-coil');

    const after = useDiagnosticStore.getState().deviceFaultStates(task);
    expect(after['-K1']?.coilOpen).toBeUndefined();
  });

  it('repair jest idempotentne', () => {
    useDiagnosticStore.getState().hydrate({ assignedFaultIds: ['f-x'] });
    useDiagnosticStore.getState().repair('f-x');
    useDiagnosticStore.getState().repair('f-x');
    expect(useDiagnosticStore.getState().repairedFaultIds).toEqual(['f-x']);
  });

  it('reset diagnostic czyści repairedFaultIds', () => {
    useDiagnosticStore.getState().hydrate({ assignedFaultIds: ['f-x'], repairedFaultIds: ['f-x'] });
    useDiagnosticStore.getState().reset();
    expect(useDiagnosticStore.getState().repairedFaultIds).toEqual([]);
  });

  it('assignForTask zeruje repairedFaultIds', () => {
    const { task } = loadDiag();
    useDiagnosticStore.getState().hydrate({ repairedFaultIds: ['f-x'] });
    useDiagnosticStore.getState().assignForTask(task, () => 0);
    expect(useDiagnosticStore.getState().repairedFaultIds).toEqual([]);
  });

  it('repair perystuje się do localStorage', () => {
    const { task, library } = loadDiag();
    useDiagnosticStore.getState().hydrate({ assignedFaultIds: ['f-open-c4'] });
    useProjectStore.getState().init(task, library);
    useProjectStore.getState().repairFault('f-open-c4');

    const saved = loadProject(task.id);
    expect(saved).not.toBeNull();
    expect(saved?.repairedFaultIds).toEqual(['f-open-c4']);
  });

  it('po reloadzie (init z zapisu) repairedFaultIds są zachowane', () => {
    const { task, library } = loadDiag();
    useDiagnosticStore.getState().hydrate({ assignedFaultIds: ['f-open-c4'] });
    useProjectStore.getState().init(task, library);
    useProjectStore.getState().repairFault('f-open-c4');

    // Udawaj reload — najpierw proj.task=null (żeby diag reset nie zapisał
    // pustej diag pod ten taskId), potem reset diag.
    useProjectStore.setState({
      task: null as never,
      library: null as never,
      devices: [],
      wires: [],
      selectedTag: null,
      selectedWireId: null,
      draft: null,
    });
    useDiagnosticStore.getState().reset();

    useProjectStore.getState().init(task, library);
    expect(useDiagnosticStore.getState().repairedFaultIds).toContain('f-open-c4');
    // I fault nie wrócił na wire
    const c4 = useProjectStore.getState().wires.find((w) => w.id === 'C4');
    expect(c4?.fault).toBeUndefined();
  });
});
