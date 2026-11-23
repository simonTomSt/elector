import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import { buildProjectFromTask, resolveProject } from '@/sim/model';
import { validateLive } from '@/validation/live';
import type { Project, Task } from '@/domain/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.resolve(here, '..', 'tasks', 'examples');

const loadDol4kw = (): Task => {
  const devices = loadDeviceLibrary();
  const raw = JSON.parse(readFileSync(path.join(examplesDir, 'dol-4kw.json'), 'utf8')) as unknown;
  return loadTask(raw, { devices });
};

describe('M6 – walidacja na żywo', () => {
  const devices = loadDeviceLibrary();
  const task = loadDol4kw();

  it('rozwiązanie wzorcowe spełnia wszystkie sprawdzalne wymagania', () => {
    const project = resolveProject(buildProjectFromTask(task), devices);
    const result = validateLive(task.requirements, project);
    const hard = result.issues.filter((i) => i.severity === 'error');
    expect(hard).toEqual([]);
  });

  it('bez rozwiązania (sam preset) deviceExists i inSeries failują', () => {
    const presetOnly: Project = {
      devices: task.scene.preset?.devices ?? [],
      wires: task.scene.preset?.wires ?? [],
    };
    const project = resolveProject(presetOnly, devices);
    const result = validateLive(task.requirements, project);
    const ids = result.issues.map((i) => i.requirementId);
    expect(ids).toContain('r1');
    expect(ids).toContain('r2');
    expect(ids).toContain('r4');
    expect(ids).toContain('r5');
  });

  it('wireColors wykrywa niebieski przewód PE', () => {
    const base: Project = buildProjectFromTask(task);
    const mutated: Project = {
      devices: base.devices,
      wires: base.wires.map((w) =>
        w.id === 'PE1' ? { ...w, color: 'blue' } : w,
      ),
    };
    const project = resolveProject(mutated, devices);
    const result = validateLive(task.requirements, project);
    const wc = result.issues.find((i) => i.requirementId === 'r7');
    expect(wc).toBeDefined();
    expect(wc?.detail).toMatch(/PE1/);
  });
});
