import { describe, it, expect } from 'vitest';
import { loadDeviceLibrary, parseDeviceLibrary, DeviceLibraryError } from '@/tasks/devices';

describe('Biblioteka aparatów', () => {
  it('ładuje data/devices.json i indeksuje po id', () => {
    const lib = loadDeviceLibrary();
    expect(lib.byId.has('contactor-3p-9a-24vdc')).toBe(true);
    expect(lib.byId.has('mcb-c16-3p')).toBe(true);
    expect(lib.byId.get('overload-6-10a')?.kind).toBe('overload');
  });

  it('zgłasza błąd przy duplikacie id', () => {
    const bad = {
      types: [
        { id: 'x', kind: 'mcb', prefix: '-F', mount: 'rail', widthMm: 18, terminals: [{ id: '1' }], params: {} },
        { id: 'x', kind: 'mcb', prefix: '-F', mount: 'rail', widthMm: 18, terminals: [{ id: '1' }], params: {} },
      ],
    };
    expect(() => parseDeviceLibrary(bad)).toThrow(DeviceLibraryError);
    expect(() => parseDeviceLibrary(bad)).toThrow(/duplikat id "x"/);
  });

  it('zgłasza błąd przy braku zacisków', () => {
    const bad = {
      types: [{ id: 'a', kind: 'mcb', prefix: '-F', mount: 'rail', widthMm: 18, terminals: [], params: {} }],
    };
    expect(() => parseDeviceLibrary(bad)).toThrow(/terminals: wymagana niepusta/);
  });
});
