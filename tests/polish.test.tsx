import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup, fireEvent, within, act, waitFor } from '@testing-library/react';
import { App } from '@/App';
import { useUiStore } from '@/store/ui';
import { useProjectStore } from '@/store/project';
import { useHintsStore } from '@/store/hints';
import { useResultStore } from '@/store/result';
import { saveProgress } from '@/store/persist';
import { loadDeviceLibrary } from '@/tasks/devices';
import { loadTask } from '@/tasks/loader';
import dol4kwRaw from '../tasks/examples/dol-4kw.json';

const resetAll = (): void => {
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
  useHintsStore.getState().reset();
  useResultStore.setState({ result: null, open: false });
};

describe('M18 – polerka: HintsPanel w widokach mieszanym i schemacie', () => {
  beforeEach(resetAll);
  afterEach(() => {
    cleanup();
    resetAll();
  });

  const bootstrapTask = (): void => {
    const library = loadDeviceLibrary();
    const task = loadTask(dol4kwRaw, { devices: library });
    useProjectStore.getState().init(task, library);
  };

  it('widok mieszany pokazuje odkryte podpowiedzi w prawym panelu', async () => {
    bootstrapTask();
    useHintsStore.getState().hydrate(['h1']);
    useUiStore.setState({ view: 'mixed' });
    render(<App />);
    const right = screen.getByLabelText('Panel prawy');
    await waitFor(() => {
      expect(within(right).getByTestId('hints-panel')).toBeInTheDocument();
    });
    expect(within(right).getByTestId('hints-panel')).toHaveTextContent(/Sprawdź czy -F2/i);
  });

  it('widok schematu pokazuje odkryte podpowiedzi w prawym panelu', async () => {
    bootstrapTask();
    useHintsStore.getState().hydrate(['h2']);
    useUiStore.setState({ view: 'schematic' });
    render(<App />);
    const right = screen.getByLabelText('Panel prawy');
    await waitFor(() => {
      expect(within(right).getByTestId('hints-panel')).toBeInTheDocument();
    });
    expect(within(right).getByTestId('hints-panel')).toHaveTextContent(/Samopodtrzymanie/i);
  });

  it('bez odkrytych podpowiedzi panel się nie renderuje', () => {
    bootstrapTask();
    useUiStore.setState({ view: 'mixed' });
    render(<App />);
    const right = screen.getByLabelText('Panel prawy');
    expect(within(right).queryByTestId('hints-panel')).toBeNull();
  });
});

describe('M18 – polerka: TasksScreen pokazuje liczbę podpowiedzi', () => {
  beforeEach(resetAll);
  afterEach(() => {
    cleanup();
    resetAll();
  });

  it('kafelek pokazuje "podpowiedzi: N/M" gdy kursant odkrył jakąś', () => {
    // zapisujemy projekt z 2 odkrytymi podpowiedziami + progress
    window.localStorage.setItem(
      'elector:project:dol-4kw',
      JSON.stringify({
        schemaVersion: 1,
        payload: {
          devices: [],
          wires: [],
          revealedHintIds: ['h1', 'h2'],
        },
      }),
    );
    saveProgress({ 'dol-4kw': { status: 'w-toku', updatedAt: Date.now() } });
    useUiStore.setState({ view: 'tasks' });
    render(<App />);
    const card = screen.getByTestId('task-card-dol-4kw');
    expect(card).toHaveTextContent(/podpowiedzi:\s*2\s*\/\s*3/i);
  });

  it('kafelek nie pokazuje podpowiedzi gdy nic nie odkryte', () => {
    useUiStore.setState({ view: 'tasks' });
    render(<App />);
    const card = screen.getByTestId('task-card-dol-4kw');
    expect(card).not.toHaveTextContent(/podpowiedzi:/i);
  });
});

describe('M18 – polerka: unikalne aria-label dla przycisków zamknięcia', () => {
  beforeEach(resetAll);
  afterEach(() => {
    cleanup();
    resetAll();
  });

  it('ResumeBanner i ResultModal mają różne aria-label', async () => {
    saveProgress({ 'dol-4kw': { status: 'w-toku', updatedAt: Date.now() } });
    render(<App />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Sprawdź rozwiązanie/i }));
    });
    // Oba widoczne naraz — ale accessible name muszą się różnić
    const buttons = screen.queryAllByRole('button', { name: 'Zamknij' });
    // Dokładnie jeden przycisk „Zamknij" (modal) — banner powinien używać innego label
    expect(buttons).toHaveLength(1);
    // Banner „schowaj" też musi być nadal klikalny
    expect(
      screen.getByRole('button', { name: /Schowaj komunikat|Schowaj baner/i }),
    ).toBeInTheDocument();
  });
});
