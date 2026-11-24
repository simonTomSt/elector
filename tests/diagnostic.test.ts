import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTaskRepo } from '@/tasks/loader';
import type { Task } from '@/domain/types';
import { useDiagnosticStore, pickFaults } from '@/store/diagnostic';
import { useProjectStore } from '@/store/project';

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
  window.localStorage.clear();
  useDiagnosticStore.getState().reset();
  useProjectStore.setState({
    task: null as never,
    library: null as never,
    devices: [],
    wires: [],
    selectedTag: null,
    selectedWireId: null,
    draft: null,
  });
};

describe('M19 – diagnostyka: losowanie usterek', () => {
  beforeEach(resetAll);
  afterEach(resetAll);

  it('pickFaults losuje N z listy, deterministyczne gdy podamy seed', () => {
    const { task } = loadDiag();
    const faults = task.faults ?? [];
    expect(faults.length).toBeGreaterThan(0);
    const picked = pickFaults(faults, 2, () => 0.0);
    expect(picked.length).toBe(2);
    // z seedem 0.0 Math.floor(0*N)=0 → pierwszy element, potem po filtrze kolejny pierwszy
    expect(picked[0]!.id).toBe(faults[0]!.id);
  });

  it('pickFaults z N >= length zwraca wszystkie', () => {
    const { task } = loadDiag();
    const faults = task.faults ?? [];
    const picked = pickFaults(faults, 99, Math.random);
    expect(picked.length).toBe(faults.length);
  });

  it('pickFaults z N=0 zwraca pustą listę', () => {
    const { task } = loadDiag();
    const picked = pickFaults(task.faults ?? [], 0, Math.random);
    expect(picked).toEqual([]);
  });
});

describe('M19 – diagnostic store: assign/report/reset', () => {
  beforeEach(resetAll);
  afterEach(resetAll);

  it('assignForTask zapisuje wylosowane id dla zadania', () => {
    const { task } = loadDiag();
    useDiagnosticStore.getState().assignForTask(task, () => 0);
    const state = useDiagnosticStore.getState();
    expect(state.assignedFaultIds.length).toBe(task.pickFaults ?? 0);
  });

  it('assignForTask dla nie-diagnostic lub bez faults nic nie robi', () => {
    const library = loadDeviceLibrary();
    const base = readRaw('dol-4kw.json');
    const { byId } = loadTaskRepo([base], library);
    const task = byId.get('dol-4kw');
    useDiagnosticStore.getState().assignForTask(task!, Math.random);
    expect(useDiagnosticStore.getState().assignedFaultIds).toEqual([]);
  });

  it('report zwraca correct=true gdy zbiór zgłoszony pokrywa się z wylosowanym', () => {
    const { task } = loadDiag();
    useDiagnosticStore.getState().assignForTask(task, () => 0);
    const assigned = useDiagnosticStore.getState().assignedFaultIds;
    const r = useDiagnosticStore.getState().report(assigned);
    expect(r.correct).toBe(true);
    expect(r.assigned).toEqual(assigned);
  });

  it('report zwraca correct=false gdy zbiór się nie zgadza', () => {
    const { task } = loadDiag();
    useDiagnosticStore.getState().assignForTask(task, () => 0);
    const r = useDiagnosticStore.getState().report(['nieistnieje']);
    expect(r.correct).toBe(false);
  });

  it('report zapisuje wynik w reportedFaultIds', () => {
    const { task } = loadDiag();
    useDiagnosticStore.getState().assignForTask(task, () => 0);
    useDiagnosticStore.getState().report(['f-coil']);
    expect(useDiagnosticStore.getState().reportedFaultIds).toEqual(['f-coil']);
  });

  it('hydrate ustawia stan z persystencji', () => {
    useDiagnosticStore.getState().hydrate({
      assignedFaultIds: ['f-coil'],
      reportedFaultIds: ['f-coil'],
    });
    const s = useDiagnosticStore.getState();
    expect(s.assignedFaultIds).toEqual(['f-coil']);
    expect(s.reportedFaultIds).toEqual(['f-coil']);
  });

  it('reset czyści stan', () => {
    useDiagnosticStore.getState().hydrate({ assignedFaultIds: ['f-coil'] });
    useDiagnosticStore.getState().reset();
    expect(useDiagnosticStore.getState().assignedFaultIds).toEqual([]);
  });
});

describe('M19 – diagnostyka: applyAssignedFaults na useProjectStore', () => {
  beforeEach(resetAll);
  afterEach(resetAll);

  it('wireFault "open" na przewodzie C4 powoduje że wire ma fault=open', () => {
    const { task, library } = loadDiag();
    useProjectStore.getState().init(task, library);
    // doładuj solution ręcznie (diag startuje z wired)
    const s = useProjectStore.getState();
    if (task.solution) {
      useProjectStore.setState({
        devices: [...s.devices, ...task.solution.devices],
        wires: [...s.wires, ...task.solution.wires],
      });
    }
    useDiagnosticStore.getState().hydrate({ assignedFaultIds: ['f-open-c4'] });
    useProjectStore.getState().applyAssignedFaults();
    const c4 = useProjectStore.getState().wires.find((w) => w.id === 'C4');
    expect(c4?.fault).toBe('open');
  });

  it('deviceFault wylądowuje w diagnosticDeviceStates', () => {
    const { task } = loadDiag();
    useDiagnosticStore.getState().assignForTask(task, () => 0);
    // ręcznie wybieramy f-coil
    useDiagnosticStore.getState().hydrate({ assignedFaultIds: ['f-coil'] });
    const states = useDiagnosticStore.getState().deviceFaultStates(task);
    expect(states['-K1']?.coilOpen).toBe(true);
  });
});
