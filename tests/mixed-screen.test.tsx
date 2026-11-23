import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { App } from '@/App';
import { useUiStore } from '@/store/ui';
import { useSchematicStore } from '@/store/schematic';
import { useProjectStore } from '@/store/project';

const reset = (): void => {
  useUiStore.setState({ view: 'cabinet', sceneTab: 'plate' });
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
  useProjectStore.setState({ selectedTag: null, selectedWireId: null });
};

const switchToMixed = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Szafa + schemat' }));
};

beforeEach(reset);

describe('M10 – Widok mieszany', () => {
  it('przełącza się w tryb mieszany i renderuje oba panele oraz splitter', () => {
    render(<App />);
    switchToMixed();
    expect(screen.getByRole('region', { name: 'Szafa' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Schemat' })).toBeInTheDocument();
    expect(
      screen.getByRole('separator', { name: 'Zmień proporcje paneli' }),
    ).toBeInTheDocument();
  });

  it('synchronizuje zaznaczenie szafa → schemat po dodaniu symbolu o tym samym tagu', () => {
    render(<App />);
    switchToMixed();
    act(() => {
      useSchematicStore.setState({
        symbols: [
          {
            id: 'sym1',
            tag: '-K1',
            element: 'coil',
            pins: ['-K1:A1', '-K1:A2'],
            x: 100,
            y: 100,
            sheet: 1,
          },
        ],
      });
      useProjectStore.getState().selectDevice('-K1');
    });
    expect(useSchematicStore.getState().selectedSymbolId).toBe('sym1');
  });

  it('synchronizuje zaznaczenie schemat → szafa', () => {
    render(<App />);
    switchToMixed();
    act(() => {
      useSchematicStore.setState({
        symbols: [
          {
            id: 'sym1',
            tag: '-K1',
            element: 'coil',
            pins: ['-K1:A1', '-K1:A2'],
            x: 100,
            y: 100,
            sheet: 1,
          },
        ],
      });
      useSchematicStore.getState().selectSymbol('sym1');
    });
    expect(useProjectStore.getState().selectedTag).toBe('-K1');
  });

  it('pokazuje tabelę powiązań z zaciskami wybranego aparatu', () => {
    render(<App />);
    switchToMixed();
    act(() => {
      useSchematicStore.setState({
        symbols: [
          {
            id: 'sym1',
            tag: '-K1',
            element: 'coil',
            pins: ['-K1:A1', '-K1:A2'],
            x: 100,
            y: 100,
            sheet: 1,
          },
        ],
      });
      useProjectStore.getState().selectDevice('-K1');
    });
    const panel = screen.getByRole('region', { name: /Powiązania -K1/ });
    expect(panel).toBeInTheDocument();
    expect(panel.querySelector('table')).toBeTruthy();
  });

  it('pokazuje zgodność sieci, gdy schemat jest pusty', () => {
    render(<App />);
    switchToMixed();
    expect(screen.getByText(/Sieci schematu i szafy są zgodne/)).toBeInTheDocument();
  });

  it('pokazuje niezgodność, gdy schemat ma połączenie nieistniejące w szafie', () => {
    render(<App />);
    switchToMixed();
    act(() => {
      // Usuwamy wszystkie przewody z szafy – w schemacie będziemy mieli połączenie.
      useProjectStore.setState({ wires: [] });
      useSchematicStore.setState({
        symbols: [
          {
            id: 's1',
            tag: '-K1',
            element: 'coil',
            pins: ['-K1:A1', '-K1:A2'],
            x: 100,
            y: 100,
            sheet: 1,
          },
          {
            id: 's2',
            tag: '-S2',
            element: 'pbNO',
            pins: ['-S2:13', '-S2:14'],
            x: 200,
            y: 100,
            sheet: 1,
          },
        ],
        connections: [['-S2:14', '-K1:A1']],
      });
    });
    expect(screen.getAllByText(/Niezgodność przy/).length).toBeGreaterThan(0);
  });

  it('reaguje na klawisze strzałek w splitterze (zmiana wartości aria-valuenow)', () => {
    render(<App />);
    switchToMixed();
    const sep = screen.getByRole('separator', { name: 'Zmień proporcje paneli' });
    const before = Number(sep.getAttribute('aria-valuenow'));
    fireEvent.keyDown(sep, { key: 'ArrowRight' });
    const after = Number(sep.getAttribute('aria-valuenow'));
    expect(after).toBeGreaterThan(before);
  });
});
