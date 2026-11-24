import { beforeEach, describe, expect, it } from 'vitest';
import { useHintsStore } from '@/store/hints';
import { computeScore } from '@/validation/scoring';
import { validateLive } from '@/validation/live';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import { buildProjectFromTask, resolveProject } from '@/sim/model';
import type { Hint, Task } from '@/domain/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.resolve(here, '..', 'tasks', 'examples');

const loadDol4kw = (): Task => {
  const devices = loadDeviceLibrary();
  const raw = JSON.parse(readFileSync(path.join(examplesDir, 'dol-4kw.json'), 'utf8')) as unknown;
  return loadTask(raw, { devices });
};

describe('M14 – podpowiedzi: store', () => {
  beforeEach(() => {
    useHintsStore.getState().reset();
  });

  it('startuje bez odkrytych', () => {
    expect(useHintsStore.getState().used).toBe(0);
    expect(useHintsStore.getState().revealedIds).toEqual([]);
  });

  it('reveal dodaje id i rośnie used', () => {
    useHintsStore.getState().reveal('h1');
    expect(useHintsStore.getState().used).toBe(1);
    useHintsStore.getState().reveal('h2');
    expect(useHintsStore.getState().used).toBe(2);
  });

  it('powtórny reveal tego samego id nie zwiększa used', () => {
    useHintsStore.getState().reveal('h1');
    useHintsStore.getState().reveal('h1');
    expect(useHintsStore.getState().used).toBe(1);
  });

  it('reset czyści', () => {
    useHintsStore.getState().reveal('h1');
    useHintsStore.getState().reset();
    expect(useHintsStore.getState().used).toBe(0);
  });

  it('hydrate ustawia revealedIds z persystencji', () => {
    useHintsStore.getState().hydrate(['h1', 'h2']);
    expect(useHintsStore.getState().used).toBe(2);
    expect(new Set(useHintsStore.getState().revealedIds)).toEqual(new Set(['h1', 'h2']));
  });
});

describe('M14 – scoring per-level', () => {
  const devices = loadDeviceLibrary();
  const task = loadDol4kw();

  it('bez hints.level i bez scoring.hintLevels używa płaskiego hintPenalty', () => {
    const project = resolveProject(buildProjectFromTask(task), devices);
    const validation = validateLive(task.requirements, project, undefined, { task, devices });
    const taskFlat: Task = { ...task, scoring: { hintPenalty: 5 } };
    const score = computeScore(taskFlat, validation, {
      lotoIncidents: 0,
      hintsUsed: 2,
      revealedHints: [],
    });
    expect(score.penalties.hints).toBe(10);
  });

  it('z scoring.hintLevels sumuje kary per level odkrytych podpowiedzi', () => {
    const project = resolveProject(buildProjectFromTask(task), devices);
    const validation = validateLive(task.requirements, project, undefined, { task, devices });
    const hints: Hint[] = [
      { id: 'h1', text: 'a', level: 'subtelna' },
      { id: 'h2', text: 'b', level: 'bezpośrednia' },
      { id: 'h3', text: 'c', level: 'rozwiązanie' },
    ];
    const taskLv: Task = {
      ...task,
      hints,
      scoring: {
        hintLevels: { subtelna: 2, bezpośrednia: 5, rozwiązanie: 15 },
      },
    };
    const score = computeScore(taskLv, validation, {
      lotoIncidents: 0,
      hintsUsed: 2,
      revealedHints: ['h1', 'h3'],
    });
    expect(score.penalties.hints).toBe(2 + 15);
  });

  it('nieznany level traktuje jako 0', () => {
    const project = resolveProject(buildProjectFromTask(task), devices);
    const validation = validateLive(task.requirements, project, undefined, { task, devices });
    const hints: Hint[] = [{ id: 'h1', text: 'a', level: 'subtelna' }];
    const taskLv: Task = {
      ...task,
      hints,
      scoring: { hintLevels: { bezpośrednia: 5 } },
    };
    const score = computeScore(taskLv, validation, {
      lotoIncidents: 0,
      hintsUsed: 1,
      revealedHints: ['h1'],
    });
    expect(score.penalties.hints).toBe(0);
  });
});
