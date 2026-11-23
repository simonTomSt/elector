import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTaskRepo } from '@/tasks/loader';
import { runScenario } from '@/sim/scenario';
import type { Task } from '@/domain/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.resolve(here, '..', 'tasks', 'examples');

const loadAll = (): Map<string, Task> => {
  const devices = loadDeviceLibrary();
  const files = readdirSync(examplesDir).filter((f) => f.endsWith('.json'));
  const raws = files.map((f) => JSON.parse(readFileSync(path.join(examplesDir, f), 'utf8')) as unknown);
  const { byId } = loadTaskRepo(raws, devices);
  return byId;
};

describe('M3 – scenariusze testowe przykładów', () => {
  const devices = loadDeviceLibrary();
  const byId = loadAll();

  it('dol-4kw: start-stop', () => {
    const task = byId.get('dol-4kw');
    expect(task).toBeDefined();
    const res = runScenario(task!, 'start-stop', devices);
    expect(res.failures).toEqual([]);
    expect(res.ok).toBe(true);
  });

  it('dol-4kw: overload (120 s)', () => {
    const task = byId.get('dol-4kw');
    const res = runScenario(task!, 'overload', devices);
    expect(res.failures).toEqual([]);
    expect(res.ok).toBe(true);
  }, 120000);

  it('dol-4kw: short-l1-n', () => {
    const task = byId.get('dol-4kw');
    const res = runScenario(task!, 'short-l1-n', devices);
    expect(res.failures).toEqual([]);
    expect(res.ok).toBe(true);
  });

  it('dol-schematic: schematic-start', () => {
    const task = byId.get('dol-schematic');
    const res = runScenario(task!, 'schematic-start', devices);
    expect(res.failures).toEqual([]);
    expect(res.ok).toBe(true);
  });

  it('diag-no-start: fault-visible', () => {
    const task = byId.get('diag-no-start');
    const res = runScenario(task!, 'fault-visible', devices);
    expect(res.failures).toEqual([]);
    expect(res.ok).toBe(true);
  });

  it('diag-no-start: loto-order (M8)', () => {
    const task = byId.get('diag-no-start');
    const res = runScenario(task!, 'loto-order', devices);
    expect(res.failures).toEqual([]);
    expect(res.ok).toBe(true);
  });
});
