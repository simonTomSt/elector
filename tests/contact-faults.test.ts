import { describe, expect, it } from 'vitest';
import dol4kwRaw from '../tasks/examples/dol-4kw.json';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import { buildProjectFromTask, resolveProject } from '@/sim/model';
import { buildGraph } from '@/sim/graph';

const library = loadDeviceLibrary();
const task = loadTask(dol4kwRaw, { devices: library });

describe('M24 – contactWelded / contactOpen w silniku', () => {
  it('contactsWelded: stycznik zachowuje się jak w pełni zamknięty (NO closed, NC open)', () => {
    const project = resolveProject(buildProjectFromTask(task), library);
    // -K1 jako zgrzany — style NO powinien być zamknięty, choć coil nie jest energizowana
    const graph = buildGraph(project, {
      '-K1': { contactsWelded: true, coil: false, closed: false },
    });
    // Styk główny -K1:1 ↔ -K1:2 (NO/coil) → oba terminale w tej samej sieci
    const n1 = graph.netOf.get('-K1:1');
    const n2 = graph.netOf.get('-K1:2');
    expect(n1).toBeDefined();
    expect(n1).toBe(n2);
  });

  it('contactsOpen: stycznik zachowuje się jak przerwany (nawet gdy coil działa)', () => {
    const project = resolveProject(buildProjectFromTask(task), library);
    const graph = buildGraph(project, {
      '-K1': { contactsOpen: true, coil: true, closed: true },
    });
    // -K1:1 i -K1:2 NIE łączą się mimo że normalnie closed=true by je łączyło
    const n1 = graph.netOf.get('-K1:1');
    const n2 = graph.netOf.get('-K1:2');
    expect(n1).toBeDefined();
    expect(n2).toBeDefined();
    expect(n1).not.toBe(n2);
  });

  it('bez flag faulta: normalna logika closed działa', () => {
    const project = resolveProject(buildProjectFromTask(task), library);
    const closed = buildGraph(project, { '-K1': { closed: true } });
    const open = buildGraph(project, { '-K1': { closed: false } });
    expect(closed.netOf.get('-K1:1')).toBe(closed.netOf.get('-K1:2'));
    expect(open.netOf.get('-K1:1')).not.toBe(open.netOf.get('-K1:2'));
  });
});
