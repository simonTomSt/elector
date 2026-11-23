import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '@/App';
import { useUiStore } from '@/store/ui';
import { useSchematicStore } from '@/store/schematic';

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
};

beforeEach(reset);

describe('Ekran edytora schematu', () => {
  it('przełącza się z szafy na schemat i renderuje bibliotekę + arkusz + ERC', () => {
    render(<App />);
    const schematicButton = screen.getByRole('button', { name: 'Schemat' });
    fireEvent.click(schematicButton);
    expect(screen.getByLabelText('Biblioteka symboli')).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: 'Narzędzia schematu' })).toBeInTheDocument();
    expect(screen.getByText(/Kontrola schematu/i)).toBeInTheDocument();
  });

  it('pozwala dodać symbol z palety i odnotowuje go w stopce', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Schemat' }));
    const coilButton = screen.getByRole('button', { name: 'Wstaw: Cewka' });
    fireEvent.click(coilButton);
    expect(useSchematicStore.getState().symbols).toHaveLength(1);
    expect(screen.getByText(/Symbole 1/)).toBeInTheDocument();
  });

  it('zmienia narzędzie po kliknięciu w toolbar', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Schemat' }));
    const wireTool = screen.getByRole('button', { name: /Połączenie/ });
    fireEvent.click(wireTool);
    expect(useSchematicStore.getState().tool).toBe('wire');
  });
});
