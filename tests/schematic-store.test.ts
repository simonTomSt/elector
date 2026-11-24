import { describe, expect, it, beforeEach } from 'vitest';
import { useSchematicStore } from '@/store/schematic';

const reset = (): void => {
  useSchematicStore.setState({
    tool: 'select',
    symbols: [],
    connections: [],
    potentials: [],
    selectedSymbolId: null,
    sheet: 1,
    draft: null,
    pendingPotentialName: '+24V',
  });
};

beforeEach(reset);

describe('useSchematicStore', () => {
  it('dodaje symbol i śledzi jego piny', () => {
    const id = useSchematicStore
      .getState()
      .addSymbol('coil', '-K1', { x: 100, y: 100 }, ['-K1:A1', '-K1:A2']);
    const state = useSchematicStore.getState();
    expect(state.symbols).toHaveLength(1);
    expect(state.selectedSymbolId).toBe(id);
    expect(state.symbols[0]?.pins).toEqual(['-K1:A1', '-K1:A2']);
  });

  it('usuwa symbol wraz z jego połączeniami', () => {
    const s = useSchematicStore.getState();
    const a = s.addSymbol('coil', '-K1', { x: 0, y: 0 }, ['-K1:A1', '-K1:A2']);
    s.addSymbol('pbNO', '-S2', { x: 50, y: 0 }, ['-S2:13', '-S2:14']);
    s.beginWire('-S2:14', { x: 50, y: 0 });
    s.commitWire('-K1:A1');
    expect(useSchematicStore.getState().connections).toHaveLength(1);
    useSchematicStore.getState().removeSymbol(a);
    expect(useSchematicStore.getState().symbols).toHaveLength(1);
    expect(useSchematicStore.getState().connections).toHaveLength(0);
  });

  it('nie tworzy duplikatu połączenia', () => {
    const s = useSchematicStore.getState();
    s.addSymbol('coil', '-K1', { x: 0, y: 0 }, ['-K1:A1', '-K1:A2']);
    s.addSymbol('pbNO', '-S2', { x: 50, y: 0 }, ['-S2:13', '-S2:14']);
    s.beginWire('-S2:14', { x: 50, y: 0 });
    s.commitWire('-K1:A1');
    s.beginWire('-K1:A1', { x: 0, y: 0 });
    s.commitWire('-S2:14');
    expect(useSchematicStore.getState().connections).toHaveLength(1);
  });

  it('zmiana narzędzia anuluje draft', () => {
    const s = useSchematicStore.getState();
    s.addSymbol('coil', '-K1', { x: 0, y: 0 }, ['-K1:A1', '-K1:A2']);
    s.beginWire('-K1:A1', { x: 0, y: 0 });
    expect(useSchematicStore.getState().draft).not.toBeNull();
    useSchematicStore.getState().setTool('select');
    expect(useSchematicStore.getState().draft).toBeNull();
  });

  it('moveSymbol zmienia pozycję i zostawia inne pola', () => {
    const s = useSchematicStore.getState();
    const id = s.addSymbol('coil', '-K1', { x: 100, y: 100 }, ['-K1:A1', '-K1:A2']);
    s.moveSymbol(id, { x: 250, y: 300 });
    const sym = useSchematicStore.getState().symbols.find((x) => x.id === id);
    expect(sym?.x).toBe(250);
    expect(sym?.y).toBe(300);
    expect(sym?.tag).toBe('-K1');
    expect(sym?.element).toBe('coil');
    expect(sym?.pins).toEqual(['-K1:A1', '-K1:A2']);
  });

  it('moveSymbol nieistniejącego id jest bezpieczny (no-op)', () => {
    const s = useSchematicStore.getState();
    s.addSymbol('coil', '-K1', { x: 100, y: 100 }, ['-K1:A1', '-K1:A2']);
    const before = useSchematicStore.getState().symbols;
    s.moveSymbol('nieistnieje', { x: 0, y: 0 });
    const after = useSchematicStore.getState().symbols;
    expect(after.map((x) => `${x.x},${x.y}`)).toEqual(before.map((x) => `${x.x},${x.y}`));
  });

  it('serializuje schemat przez getSchematic', () => {
    const s = useSchematicStore.getState();
    s.addSymbol('coil', '-K1', { x: 0, y: 0 }, ['-K1:A1', '-K1:A2']);
    s.addPotential('+24V', { x: 10, y: 10 }, '-K1:A1');
    const sch = useSchematicStore.getState().getSchematic();
    expect(sch.symbols).toHaveLength(1);
    expect(sch.potentials).toHaveLength(1);
    expect(sch.potentials?.[0]?.pin).toBe('-K1:A1');
  });
});
