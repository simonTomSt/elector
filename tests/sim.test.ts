import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import { buildProjectFromTask, resolveProject } from '@/sim/model';
import { buildGraph } from '@/sim/graph';
import { computePotentials } from '@/sim/potentials';
import { detectTrips } from '@/sim/shorts';
import type { DeviceStates } from '@/sim/state';
import type { Task } from '@/domain/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.resolve(here, '..', 'tasks', 'examples');

const loadExample = (name: string): Task => {
  const raw = JSON.parse(readFileSync(path.join(examplesDir, name), 'utf8')) as unknown;
  return loadTask(raw, { devices: loadDeviceLibrary() });
};

const prepareDol = () => {
  const devices = loadDeviceLibrary();
  const task = loadExample('dol-4kw.json');
  const project = resolveProject(buildProjectFromTask(task), devices);
  return { devices, task, project };
};

describe('M2 – potencjały i zwarcie dla dol-4kw', () => {
  it('bez załączenia nic nie ma napięcia (poza SUP-em)', () => {
    const { project } = prepareDol();
    const states: DeviceStates = {};
    const graph = buildGraph(project, states);
    const pot = computePotentials(project, graph);

    const plusRef = '-T1:+';
    const plusNet = graph.netOf.get(plusRef);
    expect(plusNet).toBeDefined();
    const plusTags = (plusNet !== undefined && pot.byNet.get(plusNet)) || [];
    expect(plusTags.find((t) => t.potential === 'DC+')).toBeUndefined();
  });

  it('po załączeniu -Q0, -Q1, -F1: -T1:+ ma DC+, -K1:A1 bez napięcia przed START', () => {
    const { project } = prepareDol();
    const states: DeviceStates = {
      '-Q0': { on: true },
      '-Q1': { on: true },
      '-F1': { on: true },
    };
    const graph = buildGraph(project, states);
    const pot = computePotentials(project, graph);

    const plusNet = graph.netOf.get('-T1:+');
    expect(plusNet).toBeDefined();
    const plusTags = (plusNet !== undefined && pot.byNet.get(plusNet)) || [];
    expect(plusTags.some((t) => t.potential === 'DC+' && t.sourceId === '-T1')).toBe(true);

    const a1Net = graph.netOf.get('-K1:A1');
    expect(a1Net).toBeDefined();
    const a1Tags = (a1Net !== undefined && pot.byNet.get(a1Net)) || [];
    expect(a1Tags.some((t) => t.potential === 'DC+')).toBe(false);

    expect(pot.shortCircuits).toHaveLength(0);
  });

  it('po naciśnięciu START (-S2) cewka -K1 dostaje napięcie DC+', () => {
    const { project } = prepareDol();
    const states: DeviceStates = {
      '-Q0': { on: true },
      '-Q1': { on: true },
      '-F1': { on: true },
      '-S2': { pressed: true },
    };
    const graph = buildGraph(project, states);
    const pot = computePotentials(project, graph);
    const a1Net = graph.netOf.get('-K1:A1');
    expect(a1Net).toBeDefined();
    const a1Tags = (a1Net !== undefined && pot.byNet.get(a1Net)) || [];
    expect(a1Tags.some((t) => t.potential === 'DC+' && t.sourceId === '-T1')).toBe(true);
  });

  it('zwarcie L1–N za -Q1 → zadziała -Q1 w ≤ 10 ms', () => {
    const { project } = prepareDol();
    const states: DeviceStates = {
      '-Q0': { on: true },
      '-Q1': { on: true },
    };
    project.wires.push({
      id: 'FAULT',
      a: '-K1:1',
      b: '-X1:N.top',
      color: 'blue',
      cs: 1.5,
    });

    const graph = buildGraph(project, states);
    const pot = computePotentials(project, graph);
    expect(pot.shortCircuits.length).toBeGreaterThan(0);
    const trips = detectTrips(project, graph, pot.shortCircuits);
    expect(trips.length).toBeGreaterThan(0);
    const q1 = trips.find((t) => t.deviceTag === '-Q1');
    expect(q1).toBeDefined();
    expect(q1!.timeMs).toBeLessThanOrEqual(10);
  });

  it('po wyzwoleniu -Q1 (tripped) zwarcie znika', () => {
    const { project } = prepareDol();
    const states: DeviceStates = {
      '-Q0': { on: true },
      '-Q1': { on: true, tripped: true },
    };
    project.wires.push({
      id: 'FAULT2',
      a: '-K1:1',
      b: '-X1:N.top',
      color: 'blue',
      cs: 1.5,
    });
    const graph = buildGraph(project, states);
    const pot = computePotentials(project, graph);
    expect(pot.shortCircuits).toHaveLength(0);
  });
});
