import { describe, it, expect, beforeEach } from 'vitest';
import dol4kwRaw from '../tasks/examples/dol-4kw.json';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import {
  collides,
  fitsOnRail,
  nextTagFor,
  railOccupants,
  snapToGrid,
  useProjectStore,
} from '@/store/project';

const library = loadDeviceLibrary();
const task = loadTask(dol4kwRaw, { devices: library });

beforeEach(() => {
  useProjectStore.getState().init(task, library);
  // M5 testy startują od pustej płyty, bez wstępnie umieszczonych aparatów z solution.
  useProjectStore.setState({
    devices: useProjectStore
      .getState()
      .devices.filter((d) => (d as unknown as { rail?: unknown }).rail === undefined),
    wires: [],
    selectedTag: null,
  });
});

describe('M5 – snap, kolizje, tagi', () => {
  it('snapToGrid zaokrągla do 9 mm', () => {
    expect(snapToGrid(0)).toBe(0);
    expect(snapToGrid(4)).toBe(0);
    expect(snapToGrid(5)).toBe(9);
    expect(snapToGrid(13)).toBe(9);
    expect(snapToGrid(14)).toBe(18);
    expect(snapToGrid(45)).toBe(45);
    expect(snapToGrid(49)).toBe(45);
  });

  it('fitsOnRail wymaga mieszczenia się w długości', () => {
    expect(fitsOnRail(45, 54, 429, 35)).toBe(true);
    expect(fitsOnRail(34, 54, 429, 35)).toBe(false);
    expect(fitsOnRail(420, 54, 429, 35)).toBe(false);
  });

  it('collides wykrywa przecinające się przedziały', () => {
    const occ = [{ tag: '-K1', x0: 180, x1: 225 }];
    expect(collides(170, 185, occ)).toBe(true);
    expect(collides(220, 240, occ)).toBe(true);
    expect(collides(225, 270, occ)).toBe(false);
    expect(collides(135, 180, occ)).toBe(false);
  });

  it('nextTagFor znajduje pierwszy wolny numer dla prefixu', () => {
    const existing = [
      { tag: '-K1', typeId: 'contactor-3p-9a-24vdc' },
      { tag: '-K3', typeId: 'contactor-3p-9a-24vdc' },
    ];
    expect(nextTagFor(library, 'contactor-3p-9a-24vdc', existing)).toBe('-K2');
    expect(nextTagFor(library, 'contactor-3p-9a-24vdc', [])).toBe('-K1');
  });

  it('addDeviceOnRail dodaje aparat, snapuje i generuje tag', () => {
    const before = useProjectStore.getState().devices.length;
    const tag = useProjectStore.getState().addDeviceOnRail('contactor-3p-9a-24vdc', 1, 53);
    expect(tag).toBe('-K1');
    const state = useProjectStore.getState();
    expect(state.devices.length).toBe(before + 1);
    const added = state.devices.find((d) => d.tag === '-K1') as unknown as {
      rail: number;
      xMm: number;
    };
    expect(added.rail).toBe(1);
    expect(added.xMm).toBe(54);
  });

  it('addDeviceOnRail odrzuca kolizję z istniejącym aparatem', () => {
    useProjectStore.getState().addDeviceOnRail('contactor-3p-9a-24vdc', 1, 45);
    const countAfterFirst = useProjectStore.getState().devices.length;
    const second = useProjectStore.getState().addDeviceOnRail('contactor-3p-9a-24vdc', 1, 54);
    expect(second).toBeNull();
    expect(useProjectStore.getState().devices.length).toBe(countAfterFirst);
  });

  it('railOccupants zwraca aparaty tylko z wybranej szyny', () => {
    useProjectStore.getState().addDeviceOnRail('contactor-3p-9a-24vdc', 1, 45);
    useProjectStore.getState().addDeviceOnRail('overload-6-10a', 2, 180);
    const r1 = railOccupants(library, useProjectStore.getState().devices, 1);
    const r2 = railOccupants(library, useProjectStore.getState().devices, 2);
    expect(r1.some((o) => o.tag === '-K1')).toBe(true);
    expect(r2.some((o) => o.tag.startsWith('-F'))).toBe(true);
    expect(r1.some((o) => o.tag.startsWith('-F'))).toBe(false);
  });

  it('moveDevice snapuje pozycję i blokuje kolizję', () => {
    useProjectStore.getState().addDeviceOnRail('contactor-3p-9a-24vdc', 1, 45);
    useProjectStore.getState().addDeviceOnRail('motor-breaker-6-10a', 1, 108);
    useProjectStore.getState().moveDevice('-K1', 50);
    const k1 = useProjectStore.getState().devices.find((d) => d.tag === '-K1') as unknown as {
      xMm: number;
    };
    expect(k1.xMm).toBe(54);
    useProjectStore.getState().moveDevice('-K1', 95);
    const after = useProjectStore.getState().devices.find((d) => d.tag === '-K1') as unknown as {
      xMm: number;
    };
    expect(after.xMm).toBe(54);
  });

  it('removeDevice kasuje aparat i czyści zaznaczenie', () => {
    useProjectStore.getState().addDeviceOnRail('contactor-3p-9a-24vdc', 1, 45);
    useProjectStore.getState().selectDevice('-K1');
    useProjectStore.getState().removeDevice('-K1');
    const state = useProjectStore.getState();
    expect(state.devices.find((d) => d.tag === '-K1')).toBeUndefined();
    expect(state.selectedTag).toBeNull();
  });

  it('setZoom klamruje wartości do [0.5, 3]', () => {
    useProjectStore.getState().setZoom(10);
    expect(useProjectStore.getState().view.zoom).toBe(3);
    useProjectStore.getState().setZoom(0.1);
    expect(useProjectStore.getState().view.zoom).toBe(0.5);
  });
});
