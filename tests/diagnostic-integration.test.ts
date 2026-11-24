import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTaskRepo } from '@/tasks/loader';
import type { Task } from '@/domain/types';
import { useDiagnosticStore } from '@/store/diagnostic';
import { useProjectStore } from '@/store/project';
import { resolveState } from '@/store/project';
import { buildGraph } from '@/sim/graph';
import { resolveProject } from '@/sim/model';

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

describe('M23 – diagnostyka × silnik: fault faktycznie przerywa obwód', () => {
  beforeEach(resetAll);
  afterEach(resetAll);

  it('wire C4 ma fault="open" po init diagnostic z assigned f-open-c4', () => {
    const { task, library } = loadDiag();
    useDiagnosticStore.getState().hydrate({ assignedFaultIds: ['f-open-c4'] });
    useProjectStore.getState().init(task, library);
    const c4 = useProjectStore.getState().wires.find((w) => w.id === 'C4');
    expect(c4?.fault).toBe('open');
  });

  it('wire z fault=open nie łączy sieci w buildGraph', () => {
    const { task, library } = loadDiag();
    useDiagnosticStore.getState().hydrate({ assignedFaultIds: ['f-open-c4'] });
    useProjectStore.getState().init(task, library);
    const state = useProjectStore.getState();
    const project = resolveState({
      devices: state.devices,
      wires: state.wires,
      library,
    });
    // Zbuduj graf i sprawdź że -X3:4.top i -K1:A1 NIE są w tej samej sieci
    // (C4 miał to łączyć, a jest przerwany)
    const resolved = resolveProject(
      { devices: state.devices, wires: state.wires },
      library,
    );
    const graph = buildGraph(resolved, {});
    const netA = graph.netOf.get('-X3:4.top');
    const netB = graph.netOf.get('-K1:A1');
    expect(netA).toBeDefined();
    expect(netB).toBeDefined();
    expect(netA).not.toBe(netB);
    expect(project.wires.length).toBeGreaterThan(0);
  });

  it('bez faulta w store wire C4 nie ma fault po init', () => {
    const { task, library } = loadDiag();
    // Wymusź pusty assigned (nie diagnostic-random)
    useDiagnosticStore.getState().hydrate({ assignedFaultIds: [] });
    useProjectStore.getState().init(task, library);
    const c4 = useProjectStore.getState().wires.find((w) => w.id === 'C4');
    expect(c4?.fault).toBeUndefined();
  });
});
