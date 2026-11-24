import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import { buildProjectFromTask, resolveProject } from '@/sim/model';
import { validateLive } from '@/validation/live';
import { computeScore } from '@/validation/scoring';
import type { Project, Task } from '@/domain/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.resolve(here, '..', 'tasks', 'examples');

const loadDol4kw = (): Task => {
  const devices = loadDeviceLibrary();
  const raw = JSON.parse(readFileSync(path.join(examplesDir, 'dol-4kw.json'), 'utf8')) as unknown;
  return loadTask(raw, { devices });
};

describe('M13 – scoring', () => {
  const devices = loadDeviceLibrary();
  const task = loadDol4kw();

  it('rozwiązanie wzorcowe dol-4kw zdaje scenario start-stop', () => {
    const project = resolveProject(buildProjectFromTask(task), devices);
    const result = validateLive(task.requirements, project, undefined, {
      task,
      devices,
    });
    const scenarioIssue = result.issues.find((i) => i.requirementId === 'r8');
    expect(scenarioIssue).toBeUndefined();
  });

  it('bez solution scenario fail (ale deviceExists niektóre zdane)', () => {
    const presetOnly: Project = {
      devices: task.scene.preset?.devices ?? [],
      wires: task.scene.preset?.wires ?? [],
    };
    const project = resolveProject(presetOnly, devices);
    const taskNoSolution: Task = { ...task };
    delete (taskNoSolution as { solution?: unknown }).solution;
    const result = validateLive(taskNoSolution.requirements, project, undefined, {
      task: taskNoSolution,
      devices,
    });
    const ids = result.issues.map((i) => i.requirementId);
    expect(ids).toContain('r8');
  });

  it('computeScore na wzorcowym rozwiązaniu daje 100/100 i status "ukonczone"', () => {
    const project = resolveProject(buildProjectFromTask(task), devices);
    const validation = validateLive(task.requirements, project, undefined, {
      task,
      devices,
    });
    const score = computeScore(task, validation, { lotoIncidents: 0, hintsUsed: 0 });
    expect(score.max).toBe(100);
    expect(score.value).toBe(100);
    expect(score.passed).toBe(true);
    expect(score.items).toHaveLength(task.requirements.length);
    expect(score.items.every((i) => i.ok)).toBe(true);
  });

  it('computeScore z presetem (bez solution) daje <100 i status "w-toku"', () => {
    const presetOnly: Project = {
      devices: task.scene.preset?.devices ?? [],
      wires: task.scene.preset?.wires ?? [],
    };
    const project = resolveProject(presetOnly, devices);
    const taskNoSolution: Task = { ...task };
    delete (taskNoSolution as { solution?: unknown }).solution;
    const validation = validateLive(taskNoSolution.requirements, project, undefined, {
      task: taskNoSolution,
      devices,
    });
    const score = computeScore(taskNoSolution, validation, { lotoIncidents: 0, hintsUsed: 0 });
    expect(score.passed).toBe(false);
    expect(score.value).toBeLessThan(100);
    expect(score.items.some((i) => !i.ok)).toBe(true);
  });

  it('kara LOTO odejmuje lotoPenalty * incydenty', () => {
    const project = resolveProject(buildProjectFromTask(task), devices);
    const validation = validateLive(task.requirements, project, undefined, { task, devices });
    const taskWithPenalty: Task = {
      ...task,
      scoring: { lotoPenalty: 10, hintPenalty: 5 },
    };
    const score = computeScore(taskWithPenalty, validation, {
      lotoIncidents: 2,
      hintsUsed: 1,
    });
    expect(score.value).toBe(100 - 2 * 10 - 1 * 5);
    expect(score.penalties.loto).toBe(20);
    expect(score.penalties.hints).toBe(5);
  });

  it('wynik nie schodzi poniżej zera', () => {
    const project = resolveProject(buildProjectFromTask(task), devices);
    const validation = validateLive(task.requirements, project, undefined, { task, devices });
    const taskWithHeavyPenalty: Task = {
      ...task,
      scoring: { lotoPenalty: 200 },
    };
    const score = computeScore(taskWithHeavyPenalty, validation, {
      lotoIncidents: 5,
      hintsUsed: 0,
    });
    expect(score.value).toBe(0);
  });
});
