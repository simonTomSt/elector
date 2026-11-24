import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { App } from '@/App';
import { useUiStore } from '@/store/ui';
import { useProjectStore } from '@/store/project';
import { useResultStore } from '@/store/result';
import { loadProgress } from '@/store/persist';

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
};

describe('M13 – raport „Sprawdź rozwiązanie"', () => {
  beforeEach(() => resetStores());
  afterEach(() => {
    cleanup();
    resetStores();
  });

  it('klik „Sprawdź rozwiązanie" otwiera modal z listą kryteriów', async () => {
    render(<App />);
    const btn = screen.getByRole('button', { name: /Sprawdź rozwiązanie/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    const dialog = screen.getByRole('dialog', { name: /Wynik/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/Rozruch i zatrzymanie działają/i);
  });

  it('po uruchomieniu sprawdzenia zapisuje status w progress', async () => {
    render(<App />);
    const btn = screen.getByRole('button', { name: /Sprawdź rozwiązanie/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    const progress = loadProgress();
    expect(progress['dol-4kw']).toBeDefined();
    expect(progress['dol-4kw']?.status === 'ukonczone' || progress['dol-4kw']?.status === 'w-toku').toBe(true);
    expect(typeof progress['dol-4kw']?.score).toBe('number');
  });

  it('wzorcowe rozwiązanie daje 100/100 i status "ukonczone"', async () => {
    render(<App />);
    const btn = screen.getByRole('button', { name: /Sprawdź rozwiązanie/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    const dialog = screen.getByRole('dialog', { name: /Wynik/i });
    expect(dialog).toHaveTextContent(/100\s*\/\s*100/);
    const progress = loadProgress();
    expect(progress['dol-4kw']?.status).toBe('ukonczone');
  });

  it('klik „Zamknij" chowa modal', async () => {
    render(<App />);
    const btn = screen.getByRole('button', { name: /Sprawdź rozwiązanie/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    const close = screen.getByRole('button', { name: /Zamknij/i });
    fireEvent.click(close);
    expect(screen.queryByRole('dialog', { name: /Wynik/i })).toBeNull();
  });
});
