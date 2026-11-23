import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import { buildProjectFromTask, resolveProject, type ResolvedProject } from '@/sim/model';
import { createSimState, stepMany } from '@/sim/step';
import { measureMeter } from '@/sim/meter';
import type { Task } from '@/domain/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.resolve(here, '..', 'tasks', 'examples');

const loadExample = (name: string): Task => {
  const raw = JSON.parse(readFileSync(path.join(examplesDir, name), 'utf8')) as unknown;
  return loadTask(raw, { devices: loadDeviceLibrary() });
};

const buildDol = (): { project: ResolvedProject } => {
  const lib = loadDeviceLibrary();
  const task = loadExample('dol-4kw.json');
  const project = resolveProject(buildProjectFromTask(task), lib);
  return { project };
};

const energize = (project: ResolvedProject) => {
  const sim = createSimState();
  sim.states['-Q0'] = { on: true };
  sim.states['-Q1'] = { on: true };
  sim.states['-F1'] = { on: true };
  stepMany(sim, project, 200);
  return sim;
};

describe('M8 – miernik', () => {
  it('off → "—"', () => {
    const { project } = buildDol();
    const sim = createSimState();
    const r = measureMeter({ project, states: sim.states, range: 'off', probes: [null, null] });
    expect(r.value).toBe('—');
  });

  it('vac bez zasilania = 0 V', () => {
    const { project } = buildDol();
    const sim = createSimState();
    const r = measureMeter({
      project,
      states: sim.states,
      range: 'vac',
      probes: ['-X1:L1.top', '-X1:N.top'],
    });
    expect(r.value).toBe(0);
  });

  it('vac L–N ≈ 230 V po załączeniu zasilania', () => {
    const { project } = buildDol();
    const sim = energize(project);
    const r = measureMeter({
      project,
      states: sim.states,
      range: 'vac',
      probes: ['-X1:L1.top', '-X1:N.top'],
    });
    expect(typeof r.value).toBe('number');
    expect(Math.abs((r.value as number) - 230)).toBeLessThan(1);
    expect(r.unit).toBe('V');
  });

  it('vac L–L ≈ 400 V', () => {
    const { project } = buildDol();
    const sim = energize(project);
    const r = measureMeter({
      project,
      states: sim.states,
      range: 'vac',
      probes: ['-X1:L1.top', '-X1:L2.top'],
    });
    expect(Math.abs((r.value as number) - 400)).toBeLessThan(1);
  });

  it('vdc DC+/DC0 ≈ 24,1 V', () => {
    const { project } = buildDol();
    const sim = energize(project);
    const r = measureMeter({
      project,
      states: sim.states,
      range: 'vdc',
      probes: ['-T1:+', '-T1:-'],
    });
    expect(r.value).toBeCloseTo(24.1, 1);
  });

  it('ohm pod napięciem → BLOK', () => {
    const { project } = buildDol();
    const sim = energize(project);
    const r = measureMeter({
      project,
      states: sim.states,
      range: 'ohm',
      probes: ['-X1:L1.top', '-X1:N.top'],
    });
    expect(r.value).toBe('BLOK');
  });

  it('ohm na cewce -K1:A1–A2 (bez napięcia) ≈ 240 Ω', () => {
    const { project } = buildDol();
    const sim = createSimState();
    const r = measureMeter({
      project,
      states: sim.states,
      range: 'ohm',
      probes: ['-K1:A1', '-K1:A2'],
    });
    expect(typeof r.value).toBe('number');
    expect((r.value as number)).toBeCloseTo(240, 0);
  });

  it('cont: ta sama sieć → ciągłość', () => {
    const { project } = buildDol();
    const sim = createSimState();
    // -X1:L1.top ↔ -X1:L1.bot są linkiem złączki = ta sama sieć
    const r = measureMeter({
      project,
      states: sim.states,
      range: 'cont',
      probes: ['-X1:L1.top', '-X1:L1.bot'],
    });
    expect(r.continuity).toBe(true);
  });

  it('ohm oddzielne sieci → OL', () => {
    const { project } = buildDol();
    const sim = createSimState();
    const r = measureMeter({
      project,
      states: sim.states,
      range: 'ohm',
      probes: ['-X1:L1.top', '-X1:N.top'],
    });
    expect(r.value).toBe('OL');
  });
});
