import { describe, it, expect, beforeEach } from 'vitest';
import dol4kwRaw from '../tasks/examples/dol-4kw.json';
import { buildOrthoRoute } from '@/domain/routing';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import { DEFAULT_SPOOL, useProjectStore } from '@/store/project';

const library = loadDeviceLibrary();
const task = loadTask(dol4kwRaw, { devices: library });

describe('M6a – buildOrthoRoute', () => {
  it('bez zagięć: horyzontalnie-pierwsze daje punkt L', () => {
    const r = buildOrthoRoute({ xMm: 10, yMm: 10 }, [], { xMm: 50, yMm: 40 }, 'h');
    expect(r).toEqual([
      [10, 10],
      [50, 10],
      [50, 40],
    ]);
  });

  it('bez zagięć: wertykalnie-pierwsze obraca L', () => {
    const r = buildOrthoRoute({ xMm: 10, yMm: 10 }, [], { xMm: 50, yMm: 40 }, 'v');
    expect(r).toEqual([
      [10, 10],
      [10, 40],
      [50, 40],
    ]);
  });

  it('punkty współliniowe redukują się do prostej', () => {
    const r = buildOrthoRoute({ xMm: 10, yMm: 10 }, [], { xMm: 10, yMm: 40 });
    expect(r).toEqual([
      [10, 10],
      [10, 40],
    ]);
  });

  it('bend wymusza Z-kształt', () => {
    const r = buildOrthoRoute(
      { xMm: 10, yMm: 10 },
      [{ xMm: 30, yMm: 10 }],
      { xMm: 60, yMm: 40 },
    );
    expect(r[0]).toEqual([10, 10]);
    expect(r[r.length - 1]).toEqual([60, 40]);
    expect(r.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < r.length; i++) {
      const [px, py] = r[i - 1]!;
      const [cx, cy] = r[i]!;
      expect(px === cx || py === cy).toBe(true);
    }
  });
});

describe('M6a – store draft / addWire / removeWire', () => {
  beforeEach(() => {
    useProjectStore.getState().init(task, library);
    useProjectStore.setState({ wires: [] });
  });

  it('beginWire odrzuca nieznany terminal', () => {
    const r = useProjectStore
      .getState()
      .beginWire('-NOPE:1', { xMm: 0, yMm: 0 });
    expect(r.ok).toBe(false);
    expect(useProjectStore.getState().draft).toBeNull();
  });

  it('beginWire → commitWire tworzy przewód ze spoola', () => {
    const begin = useProjectStore
      .getState()
      .beginWire('-K1:A1', { xMm: 220, yMm: 47 });
    expect(begin.ok).toBe(true);
    useProjectStore.getState().setSpool({ color: 'darkBlue', cs: 0.75, ferrule: true });
    const commit = useProjectStore
      .getState()
      .commitWire('-X3:5.top', { xMm: 271, yMm: 212.5 });
    expect(commit.ok).toBe(true);
    const state = useProjectStore.getState();
    expect(state.draft).toBeNull();
    expect(state.wires.length).toBe(1);
    const w = state.wires[0]!;
    expect(w.a).toBe('-K1:A1');
    expect(w.b).toBe('-X3:5.top');
    expect(w.color).toBe('darkBlue');
    expect(w.cs).toBe(0.75);
    expect(w.ferrule).toBe(true);
    expect(w.route && w.route.length).toBeGreaterThanOrEqual(2);
    expect(state.selectedWireId).toBe(w.id);
  });

  it('commitWire odrzuca ten sam zacisk', () => {
    useProjectStore.getState().beginWire('-K1:A1', { xMm: 220, yMm: 47 });
    const r = useProjectStore.getState().commitWire('-K1:A1', { xMm: 220, yMm: 47 });
    expect(r.ok).toBe(false);
    expect(useProjectStore.getState().wires.length).toBe(0);
  });

  it('commitWire odrzuca duplikat tej samej pary', () => {
    useProjectStore.getState().beginWire('-K1:A1', { xMm: 220, yMm: 47 });
    useProjectStore.getState().commitWire('-X3:5.top', { xMm: 271, yMm: 212.5 });
    useProjectStore.getState().beginWire('-X3:5.top', { xMm: 271, yMm: 212.5 });
    const r2 = useProjectStore.getState().commitWire('-K1:A1', { xMm: 220, yMm: 47 });
    expect(r2.ok).toBe(false);
    expect(useProjectStore.getState().wires.length).toBe(1);
  });

  it('cancelWire czyści draft bez dodawania przewodu', () => {
    useProjectStore.getState().beginWire('-K1:A1', { xMm: 220, yMm: 47 });
    useProjectStore.getState().cancelWire();
    const state = useProjectStore.getState();
    expect(state.draft).toBeNull();
    expect(state.wires.length).toBe(0);
  });

  it('addDraftBend zapisuje punkt zagięcia i kursor', () => {
    useProjectStore.getState().beginWire('-K1:A1', { xMm: 220, yMm: 47 });
    useProjectStore.getState().addDraftBend({ xMm: 220, yMm: 30 });
    const d = useProjectStore.getState().draft!;
    expect(d.bends.length).toBe(1);
    expect(d.bends[0]).toEqual({ xMm: 220, yMm: 30 });
    expect(d.cursor).toEqual({ xMm: 220, yMm: 30 });
  });

  it('removeWire usuwa po id i czyści selection', () => {
    useProjectStore.getState().beginWire('-K1:A1', { xMm: 220, yMm: 47 });
    const c = useProjectStore.getState().commitWire('-X3:5.top', { xMm: 271, yMm: 212.5 });
    const id = c.ok ? c.wireId : '';
    useProjectStore.getState().selectWire(id);
    useProjectStore.getState().removeWire(id);
    const state = useProjectStore.getState();
    expect(state.wires.find((w) => w.id === id)).toBeUndefined();
    expect(state.selectedWireId).toBeNull();
  });

  it('DEFAULT_SPOOL ma sensowne wartości sterowania DC', () => {
    expect(DEFAULT_SPOOL.color).toBe('darkBlue');
    expect(DEFAULT_SPOOL.cs).toBe(0.75);
  });
});
