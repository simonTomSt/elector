import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import { buildProjectFromTask, resolveProject, type ResolvedProject } from '@/sim/model';
import { useSimStore } from '@/store/sim';
import { isAnyWireLive, LOTO_STEPS, useLotoStore } from '@/store/loto';
import type { Task } from '@/domain/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.resolve(here, '..', 'tasks', 'examples');

const loadExample = (name: string): Task => {
  const raw = JSON.parse(readFileSync(path.join(examplesDir, name), 'utf8')) as unknown;
  return loadTask(raw, { devices: loadDeviceLibrary() });
};

const buildDol = (): ResolvedProject => {
  const lib = loadDeviceLibrary();
  const task = loadExample('dol-4kw.json');
  return resolveProject(buildProjectFromTask(task), lib);
};

describe('M8 – LOTO', () => {
  beforeEach(() => {
    useSimStore.getState().turnOff();
    useLotoStore.setState({ prompt: null, completedSteps: new Set() });
  });

  it('kłódka na -Q0 blokuje załączenie', () => {
    const project = buildDol();
    useSimStore.getState().turnOn(project);
    useSimStore.getState().setLock('-Q0', true);
    useSimStore.getState().setDeviceState('-Q0', { on: true });
    const st = useSimStore.getState().view.devices['-Q0'];
    expect(st?.locked).toBe(true);
    expect(st?.on).not.toBe(true);
  });

  it('zdjęcie kłódki pozwala załączyć', () => {
    const project = buildDol();
    useSimStore.getState().turnOn(project);
    useSimStore.getState().setLock('-Q0', true);
    useSimStore.getState().setLock('-Q0', false);
    useSimStore.getState().setDeviceState('-Q0', { on: true });
    const st = useSimStore.getState().view.devices['-Q0'];
    expect(st?.on).toBe(true);
    expect(st?.locked).toBe(false);
  });

  it('założenie kłódki wymusza pozycję 0', () => {
    const project = buildDol();
    useSimStore.getState().turnOn(project);
    useSimStore.getState().setDeviceState('-Q0', { on: true });
    expect(useSimStore.getState().view.devices['-Q0']?.on).toBe(true);
    useSimStore.getState().setLock('-Q0', true);
    expect(useSimStore.getState().view.devices['-Q0']?.on).not.toBe(true);
  });

  it('isAnyWireLive wykrywa przewód pod napięciem', () => {
    const project = buildDol();
    useSimStore.getState().turnOn(project);
    useSimStore.getState().setDeviceState('-Q0', { on: true });
    useSimStore.getState().setDeviceState('-Q1', { on: true });
    useSimStore.getState().setDeviceState('-F1', { on: true });
    useSimStore.getState().stepOnce(200);
    expect(isAnyWireLive(useSimStore.getState().view.wires)).toBe(true);
  });

  it('procedura LOTO: trzy kroki → isComplete', () => {
    const loto = useLotoStore.getState();
    loto.openPrompt({ reason: 'wire', target: 'U1' });
    expect(loto.isComplete()).toBe(false);
    for (const step of LOTO_STEPS) {
      useLotoStore.getState().markStep(step);
    }
    expect(useLotoStore.getState().isComplete()).toBe(true);
  });
});
