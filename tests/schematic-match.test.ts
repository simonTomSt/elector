import { describe, expect, it } from 'vitest';
import type { Project, Schematic } from '@/domain/types';
import { loadDeviceLibrary } from '@/tasks/devices';
import { resolveProject } from '@/sim/model';
import { compareSchematicWithCabinet } from '@/sim/schematic';

describe('compareSchematicWithCabinet', () => {
  const lib = loadDeviceLibrary();

  const buildProject = (wires: Project['wires']): Project => ({
    devices: [
      { tag: '-K1', typeId: 'contactor-3p-9a-24vdc' },
      { tag: '-S2', typeId: 'pushbutton-no-green' },
      { tag: '-T1', typeId: 'psu-24vdc-2a5' },
    ],
    wires,
  });

  it('nie zgłasza różnicy, gdy sieci są zgodne', () => {
    const schematic: Schematic = {
      symbols: [
        { id: 'c', tag: '-K1', element: 'coil', pins: ['-K1:A1', '-K1:A2'] },
        { id: 's', tag: '-S2', element: 'pbNO', pins: ['-S2:13', '-S2:14'] },
        { id: 't', tag: '-T1', element: 'psu', pins: ['-T1:+', '-T1:-'] },
      ],
      connections: [
        ['-T1:+', '-S2:13'],
        ['-S2:14', '-K1:A1'],
        ['-K1:A2', '-T1:-'],
      ],
    };
    const project = resolveProject(
      buildProject([
        { id: 'U1', a: '-T1:+', b: '-S2:13', color: 'darkBlue', cs: 0.75 },
        { id: 'U2', a: '-S2:14', b: '-K1:A1', color: 'darkBlue', cs: 0.75 },
        { id: 'U3', a: '-K1:A2', b: '-T1:-', color: 'darkBlue', cs: 0.75 },
      ]),
      lib,
    );
    expect(compareSchematicWithCabinet(schematic, project)).toEqual([]);
  });

  it('wskazuje zacisk, który na schemacie jest połączony, a w szafie nie', () => {
    const schematic: Schematic = {
      symbols: [
        { id: 'c', tag: '-K1', element: 'coil', pins: ['-K1:A1', '-K1:A2'] },
        { id: 's', tag: '-S2', element: 'pbNO', pins: ['-S2:13', '-S2:14'] },
      ],
      connections: [['-S2:14', '-K1:A1']],
    };
    const project = resolveProject(
      buildProject([
        // szafa: brak przewodu S2:14 ↔ K1:A1
      ]),
      lib,
    );
    const diffs = compareSchematicWithCabinet(schematic, project);
    expect(diffs.length).toBeGreaterThan(0);
    const d = diffs.find((x) => x.terminal === '-K1:A1' || x.terminal === '-S2:14')!;
    expect(d.inSchematic.length + d.inCabinet.length).toBeGreaterThan(0);
  });
});
