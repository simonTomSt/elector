import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import dol4kwRaw from '../tasks/examples/dol-4kw.json';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import { buildProjectFromTask, resolveProject } from '@/sim/model';
import { SceneView } from '@/ui/scene';

const setup = () => {
  const devices = loadDeviceLibrary();
  const task = loadTask(dol4kwRaw, { devices });
  const project = resolveProject(buildProjectFromTask(task), devices);
  return { task, project };
};

describe('M4 – scena szafy (dol-4kw)', () => {
  it('renderuje SVG z oznaczeniami wszystkich aparatów na szynie', () => {
    const { task, project } = setup();
    const { container } = render(<SceneView task={task} project={project} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();

    const expected = ['-Q1', '-F1', '-T1', '-K1', '-F2', '-PE'];
    for (const tag of expected) {
      const el = container.querySelector(`[data-tag="${tag}"]`);
      expect(el, `brak elementu dla ${tag}`).toBeTruthy();
    }
  });

  it('renderuje wszystkie przewody rozwiązania (26)', () => {
    const { task, project } = setup();
    const { container } = render(<SceneView task={task} project={project} />);
    const wireEls = container.querySelectorAll('[data-wire]');
    const solutionCount = task.solution?.wires.length ?? 0;
    expect(solutionCount).toBeGreaterThan(0);
    expect(wireEls.length).toBe(solutionCount);
  });

  it('przewód N (W13) ma kolor z tokenu --wire-blue-color', () => {
    const { task, project } = setup();
    const { container } = render(<SceneView task={task} project={project} />);
    const w13 = container.querySelector('[data-wire="W13"]');
    expect(w13).toBeTruthy();
    const paths = w13!.querySelectorAll('path');
    const colored = Array.from(paths).find(
      (p) => p.getAttribute('stroke') === 'var(--wire-blue-color)',
    );
    expect(colored, 'oczekiwano ścieżki W13 z stroke var(--wire-blue-color)').toBeTruthy();
  });

  it('przewód PE (PE1) używa paskowego wzoru żółtego', () => {
    const { task, project } = setup();
    const { container } = render(<SceneView task={task} project={project} />);
    const pe1 = container.querySelector('[data-wire="PE1"]');
    expect(pe1).toBeTruthy();
    const paths = pe1!.querySelectorAll('path');
    const stripe = Array.from(paths).find(
      (p) =>
        p.getAttribute('stroke') === 'var(--wire-greenYellow-stripe)' &&
        p.getAttribute('stroke-dasharray') === '7 7',
    );
    expect(stripe, 'oczekiwano paskowej ścieżki żółtej dla PE1').toBeTruthy();
  });

  it('płyta ma viewBox 1000×640 (500×320 mm × 2 px/mm + pas drzwi)', () => {
    const { task, project } = setup();
    const { container } = render(<SceneView task={task} project={project} />);
    const svg = container.querySelector('svg')!;
    const vb = svg.getAttribute('viewBox');
    expect(vb).toMatch(/^0 0 1000 \d+$/);
    const parts = vb!.split(' ');
    expect(Number(parts[2])).toBe(1000);
    expect(Number(parts[3])).toBeGreaterThanOrEqual(640);
  });
});
