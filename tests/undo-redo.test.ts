import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import dol4kwRaw from '../tasks/examples/dol-4kw.json';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import { useProjectStore } from '@/store/project';

const library = loadDeviceLibrary();
const task = loadTask(dol4kwRaw, { devices: library });

const reinit = (): void => {
  window.localStorage.clear();
  useProjectStore.setState({
    task: null as never,
    library: null as never,
    devices: [],
    wires: [],
    selectedTag: null,
    selectedWireId: null,
    draft: null,
  });
  useProjectStore.getState().init(task, library);
};

describe('M21 – undo/redo', () => {
  beforeEach(reinit);
  afterEach(() => {
    window.localStorage.clear();
  });

  it('po addDeviceOnRail undo cofa dodanie', () => {
    const before = useProjectStore.getState().devices.length;
    const tag = useProjectStore.getState().addDeviceOnRail('mcb-c16-3p', 1, 45);
    expect(tag).not.toBeNull();
    expect(useProjectStore.getState().devices.length).toBe(before + 1);
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().devices.length).toBe(before);
  });

  it('redo przywraca cofniętą operację', () => {
    const before = useProjectStore.getState().devices.length;
    useProjectStore.getState().addDeviceOnRail('mcb-c16-3p', 1, 45);
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().devices.length).toBe(before);
    useProjectStore.getState().redo();
    expect(useProjectStore.getState().devices.length).toBe(before + 1);
  });

  it('undo po removeDevice przywraca urządzenie', () => {
    const tag = useProjectStore.getState().addDeviceOnRail('mcb-c16-3p', 1, 45);
    const after = useProjectStore.getState().devices.length;
    useProjectStore.getState().removeDevice(tag!);
    expect(useProjectStore.getState().devices.length).toBe(after - 1);
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().devices.find((d) => d.tag === tag)).toBeDefined();
  });

  it('nowa mutacja po undo zrzuca stos redo', () => {
    useProjectStore.getState().addDeviceOnRail('mcb-c16-3p', 1, 45);
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().canRedo()).toBe(true);
    useProjectStore.getState().addDeviceOnRail('mcb-c16-3p', 1, 45);
    expect(useProjectStore.getState().canRedo()).toBe(false);
  });

  it('canUndo/canRedo zwraca false na starcie', () => {
    reinit();
    expect(useProjectStore.getState().canUndo()).toBe(false);
    expect(useProjectStore.getState().canRedo()).toBe(false);
  });

  it('undo gdy stos pusty jest bezpieczne (no-op)', () => {
    reinit();
    const before = useProjectStore.getState().devices.length;
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().devices.length).toBe(before);
  });

  it('init zadania czyści historię', () => {
    useProjectStore.getState().addDeviceOnRail('mcb-c16-3p', 1, 45);
    expect(useProjectStore.getState().canUndo()).toBe(true);
    useProjectStore.getState().init(task, library);
    expect(useProjectStore.getState().canUndo()).toBe(false);
  });

  it('moveDevice tworzy osobny wpis w historii', () => {
    const tag = useProjectStore.getState().addDeviceOnRail('mcb-c16-3p', 1, 45);
    useProjectStore.getState().moveDevice(tag!, 90);
    const afterMove = useProjectStore.getState().devices.find((d) => d.tag === tag);
    expect((afterMove as unknown as { xMm?: number })?.xMm).toBe(90);
    useProjectStore.getState().undo();
    const afterUndo = useProjectStore.getState().devices.find((d) => d.tag === tag);
    expect((afterUndo as unknown as { xMm?: number })?.xMm).toBe(45);
  });
});
