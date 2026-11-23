import { describe, expect, it } from 'vitest';
import type { Schematic } from '@/domain/types';
import { buildSchematicNetlist, runErc } from '@/sim/schematic';

const makeSchematic = (over: Partial<Schematic>): Schematic => ({
  symbols: [],
  connections: [],
  ...over,
});

describe('buildSchematicNetlist', () => {
  it('traktuje każdy pin bez połączenia jako sierotę', () => {
    const sch = makeSchematic({
      symbols: [{ id: 's1', tag: '-K1', element: 'coil', pins: ['-K1:A1', '-K1:A2'] }],
    });
    const nl = buildSchematicNetlist(sch);
    expect(nl.orphanPins.sort()).toEqual(['-K1:A1', '-K1:A2']);
    expect(nl.nets).toHaveLength(2);
  });

  it('łączy piny przez connections', () => {
    const sch = makeSchematic({
      symbols: [
        { id: 's1', tag: '-K1', element: 'coil', pins: ['-K1:A1', '-K1:A2'] },
        { id: 's2', tag: '-S2', element: 'pbNO', pins: ['-S2:13', '-S2:14'] },
      ],
      connections: [['-S2:14', '-K1:A1']],
    });
    const nl = buildSchematicNetlist(sch);
    expect(nl.netOf.get('-S2:14')).toEqual(nl.netOf.get('-K1:A1'));
    // Niepołączone piny pozostają sierotami
    expect(nl.orphanPins.sort()).toEqual(['-K1:A2', '-S2:13']);
  });

  it('potencjały o tej samej nazwie łączą sieci', () => {
    const sch = makeSchematic({
      symbols: [
        { id: 's1', tag: '-K1', element: 'coil', pins: ['-K1:A1', '-K1:A2'] },
        { id: 's2', tag: '-T1', element: 'psu', pins: ['-T1:+', '-T1:-'] },
      ],
      potentials: [
        { id: 'p1', name: '+24V', pin: '-T1:+' },
        { id: 'p2', name: '+24V', pin: '-K1:A1' },
        { id: 'p3', name: '0V', pin: '-T1:-' },
        { id: 'p4', name: '0V', pin: '-K1:A2' },
      ],
    });
    const nl = buildSchematicNetlist(sch);
    expect(nl.netOf.get('-T1:+')).toEqual(nl.netOf.get('-K1:A1'));
    expect(nl.netOf.get('-T1:-')).toEqual(nl.netOf.get('-K1:A2'));
    expect(nl.orphanPins).toEqual([]);
    // Dwie osobne sieci.
    const uniqueRoots = new Set(nl.pinRoot.values());
    expect(uniqueRoots.size).toBe(2);
  });
});

describe('runErc', () => {
  it('zgłasza otwarte piny', () => {
    const sch = makeSchematic({
      symbols: [
        { id: 's1', tag: '-K1', element: 'coil', pins: ['-K1:A1', '-K1:A2'] },
        { id: 's2', tag: '-K1-aux', element: 'contactNO', pins: ['-K1:13', '-K1:14'] },
      ],
    });
    const issues = runErc(sch);
    const codes = issues.map((i) => i.code);
    expect(codes.filter((c) => c === 'open-pin').length).toBeGreaterThanOrEqual(1);
  });

  it('zgłasza dwa potencjały w jednej sieci', () => {
    const sch = makeSchematic({
      symbols: [{ id: 's1', tag: '-K1', element: 'coil', pins: ['-K1:A1', '-K1:A2'] }],
      connections: [['-K1:A1', '-K1:A2']],
      potentials: [
        { id: 'p1', name: '+24V', pin: '-K1:A1' },
        { id: 'p2', name: '0V', pin: '-K1:A2' },
      ],
    });
    const issues = runErc(sch);
    expect(issues.some((i) => i.code === 'double-potential')).toBe(true);
  });

  it('zgłasza cewkę bez styków i styk bez cewki', () => {
    const sch = makeSchematic({
      symbols: [
        { id: 's1', tag: '-K1', element: 'coil', pins: ['-K1:A1', '-K1:A2'] },
        { id: 's2', tag: '-K2', element: 'contactNO', pins: ['-K2:13', '-K2:14'] },
      ],
    });
    const issues = runErc(sch);
    expect(issues.some((i) => i.code === 'coil-without-contacts' && i.tag === '-K1')).toBe(true);
    expect(issues.some((i) => i.code === 'contact-without-coil' && i.tag === '-K2')).toBe(true);
  });

  it('nie zgłasza stuku dla przycisków (są samoaktuowane)', () => {
    const sch = makeSchematic({
      symbols: [{ id: 's1', tag: '-S2', element: 'pbNO', pins: ['-S2:13', '-S2:14'] }],
    });
    const issues = runErc(sch);
    expect(issues.some((i) => i.code === 'contact-without-coil')).toBe(false);
  });
});
