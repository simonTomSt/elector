import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import { buildProjectFromTask, resolveProject, type ResolvedProject } from '@/sim/model';
import { useSimStore } from '@/store/sim';
import type { Task } from '@/domain/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.resolve(here, '..', 'tasks', 'examples');

const loadExample = (name: string): Task => {
  const raw = JSON.parse(readFileSync(path.join(examplesDir, name), 'utf8')) as unknown;
  return loadTask(raw, { devices: loadDeviceLibrary() });
};

const buildProject = (): ResolvedProject => {
  const lib = loadDeviceLibrary();
  const task = loadExample('dol-4kw.json');
  return resolveProject(buildProjectFromTask(task), lib);
};

describe('M7 – sim store', () => {
  beforeEach(() => {
    useSimStore.getState().turnOff();
  });

  it('turnOn aktywuje symulację i buduje widok z napiszanymi przewodami po włączeniu -Q0/-Q1/-F1', () => {
    const project = buildProject();
    useSimStore.getState().turnOn(project);
    expect(useSimStore.getState().on).toBe(true);
    expect(useSimStore.getState().running).toBe(true);

    // Tylko przewody po stronie zasilania (przed -Q0) powinny być live.
    const view0 = useSimStore.getState().view;
    const liveCount0 = Object.values(view0.wires).filter((w) => w.live).length;
    expect(liveCount0).toBeGreaterThanOrEqual(1);
    expect(liveCount0).toBeLessThanOrEqual(4);

    // Załącz zasilanie
    useSimStore.getState().setDeviceState('-Q0', { on: true });
    useSimStore.getState().setDeviceState('-Q1', { on: true });
    useSimStore.getState().setDeviceState('-F1', { on: true });
    useSimStore.getState().stepOnce(200);

    const view1 = useSimStore.getState().view;
    const liveWires = Object.values(view1.wires).filter((w) => w.live).length;
    expect(liveWires).toBeGreaterThan(0);
    expect(view1.devices['-T1']?.out).toBe(true);
  });

  it('press -S2 → K1.closed i M1.running (odpowiednik scenariusza start-stop)', () => {
    const project = buildProject();
    useSimStore.getState().turnOn(project);
    useSimStore.getState().setDeviceState('-Q0', { on: true });
    useSimStore.getState().setDeviceState('-Q1', { on: true });
    useSimStore.getState().setDeviceState('-F1', { on: true });
    useSimStore.getState().stepOnce(200);

    useSimStore.getState().pressButton('-S2', true);
    useSimStore.getState().stepOnce(200);
    useSimStore.getState().pressButton('-S2', false);
    useSimStore.getState().stepOnce(1000);

    const v = useSimStore.getState().view;
    expect(v.devices['-K1']?.closed).toBe(true);
    expect(v.devices['-M1']?.running).toBe(true);
    expect(v.devices['-H1']?.lit).toBe(true);
    const flowWires = Object.values(v.wires).filter((w) => w.flow).length;
    expect(flowWires).toBeGreaterThan(0);
  });

  it('setSpeed i togglePlay zmieniają stan', () => {
    const project = buildProject();
    useSimStore.getState().turnOn(project);
    expect(useSimStore.getState().running).toBe(true);
    useSimStore.getState().togglePlay();
    expect(useSimStore.getState().running).toBe(false);
    useSimStore.getState().setSpeed(0.1);
    expect(useSimStore.getState().speed).toBe(0.1);
  });

  it('tick nie posuwa czasu przy pauzie', () => {
    const project = buildProject();
    useSimStore.getState().turnOn(project);
    useSimStore.getState().togglePlay(); // pause
    useSimStore.getState().tick(1000);
    useSimStore.getState().tick(2000);
    expect(useSimStore.getState().view.t).toBe(0);
  });

  it('tick posuwa czas z prędkością 1× (50 ms wall ≈ 50 ms sim)', () => {
    const project = buildProject();
    useSimStore.getState().turnOn(project);
    // pierwszy tick ustawia _lastWallMs
    useSimStore.getState().tick(0);
    useSimStore.getState().tick(50);
    const t = useSimStore.getState().view.t;
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThanOrEqual(50);
  });

  it('turnOff czyści widok i oznacza on=false', () => {
    const project = buildProject();
    useSimStore.getState().turnOn(project);
    useSimStore.getState().setDeviceState('-Q0', { on: true });
    useSimStore.getState().turnOff();
    expect(useSimStore.getState().on).toBe(false);
    expect(useSimStore.getState().view.t).toBe(0);
    expect(Object.keys(useSimStore.getState().view.wires)).toHaveLength(0);
  });
});
