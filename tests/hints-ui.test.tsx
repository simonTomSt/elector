import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';
import { App } from '@/App';
import { useUiStore } from '@/store/ui';
import { useProjectStore } from '@/store/project';
import { useResultStore } from '@/store/result';
import { useHintsStore } from '@/store/hints';

const resetStores = (): void => {
  window.localStorage.clear();
  useProjectStore.setState({
    task: null as never,
    library: null as never,
    devices: [],
    wires: [],
    selectedTag: null,
    selectedWireId: null,
    draft: null,
  });
  useUiStore.setState({
    view: 'cabinet',
    theme: 'dark',
    currentTaskId: 'dol-4kw',
    sceneTab: 'plate',
  });
  useResultStore.setState({ result: null, open: false });
  useHintsStore.getState().reset();
};

describe('M14 – podpowiedzi: UI', () => {
  beforeEach(() => resetStores());
  afterEach(() => {
    cleanup();
    resetStores();
  });

  it('TopBar pokazuje przycisk "Podpowiedź" gdy zadanie ma hints', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Podpowiedź/i })).toBeInTheDocument();
  });

  it('klik przycisku odsłania pierwszą podpowiedź w panelu w Inspector', () => {
    render(<App />);
    const btn = screen.getByRole('button', { name: /Podpowiedź/i });
    fireEvent.click(btn);
    const right = screen.getByLabelText('Panel prawy');
    expect(within(right).getByTestId('hints-panel')).toBeInTheDocument();
    expect(within(right).getByTestId('hints-panel')).toHaveTextContent(/Sprawdź czy -F2/i);
  });

  it('kolejne kliknięcia odsłaniają kolejne podpowiedzi', () => {
    render(<App />);
    const btn = screen.getByRole('button', { name: /Podpowiedź/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    const right = screen.getByLabelText('Panel prawy');
    const panel = within(right).getByTestId('hints-panel');
    const items = within(panel).getAllByRole('listitem');
    expect(items.length).toBe(2);
  });

  it('po odkryciu wszystkich przycisk jest disabled', () => {
    render(<App />);
    const btn = screen.getByRole('button', { name: /Podpowiedź/i }) as HTMLButtonElement;
    const total = useProjectStore.getState().task.hints?.length ?? 0;
    expect(total).toBeGreaterThan(0);
    for (let i = 0; i < total; i += 1) fireEvent.click(btn);
    expect(btn.disabled).toBe(true);
  });

  it('scoring po użyciu 2 podpowiedzi uwzględnia hintPenalty per-level', async () => {
    render(<App />);
    const hintBtn = screen.getByRole('button', { name: /Podpowiedź/i });
    fireEvent.click(hintBtn);
    fireEvent.click(hintBtn);
    const check = screen.getByRole('button', { name: /Sprawdź rozwiązanie/i });
    await act(async () => {
      fireEvent.click(check);
    });
    const dialog = screen.getByRole('dialog', { name: /Wynik/i });
    expect(dialog).toHaveTextContent(/podpowiedzi −/);
  });

  it('odkryte podpowiedzi są perystowane w projekcie', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Podpowiedź/i }));
    const raw = window.localStorage.getItem('elector:project:dol-4kw');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as { payload: { revealedHintIds?: string[] } };
    expect(parsed.payload.revealedHintIds?.length).toBe(1);
  });
});
