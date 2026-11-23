import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react';
import { App } from '@/App';
import { useUiStore } from '@/store/ui';
import {
  CURRENT_SCHEMA_VERSION,
  saveProgress,
  saveProject,
  loadUi,
  exportSnapshot,
} from '@/store/persist';
import { useProjectStore } from '@/store/project';

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
  useUiStore.setState({ view: 'tasks', theme: 'dark', currentTaskId: null, sceneTab: 'plate' });
};

describe('M12 – ekran wyboru zadania', () => {
  beforeEach(() => resetStores());
  afterEach(() => {
    cleanup();
    resetStores();
  });

  it('startuje na widoku "tasks" i pokazuje listę przykładowych zadań', () => {
    render(<App />);
    const panel = screen.getByLabelText('Scena');
    expect(within(panel).getByRole('heading', { name: /Wybierz zadanie/i })).toBeInTheDocument();
    expect(within(panel).getByText(/dol-4kw/)).toBeInTheDocument();
    expect(within(panel).getByText(/diag-no-start/)).toBeInTheDocument();
  });

  it('po kliknięciu kafelka otwiera zadanie i przełącza widok na "cabinet"', () => {
    render(<App />);
    const panel = screen.getByLabelText('Scena');
    const card = within(panel).getByRole('button', { name: /Otwórz zadanie dol-4kw/i });
    fireEvent.click(card);
    expect(useUiStore.getState().view).toBe('cabinet');
    expect(useUiStore.getState().currentTaskId).toBe('dol-4kw');
  });

  it('pokazuje status "W toku" gdy jest zapis postępu', () => {
    saveProgress({ 'dol-4kw': { status: 'w-toku', updatedAt: Date.now() } });
    render(<App />);
    const panel = screen.getByLabelText('Scena');
    const row = within(panel).getByTestId('task-card-dol-4kw');
    expect(within(row).getByText(/W toku/i)).toBeInTheDocument();
  });

  it('akcja "Zacznij od nowa" usuwa zapis zadania', () => {
    saveProject('dol-4kw', { devices: [], wires: [] });
    render(<App />);
    const panel = screen.getByLabelText('Scena');
    const row = within(panel).getByTestId('task-card-dol-4kw');
    const btn = within(row).getByRole('button', { name: /Zacznij od nowa/i });
    fireEvent.click(btn);
    expect(window.localStorage.getItem('elector:project:dol-4kw')).toBeNull();
  });

  it('eksport snapshotu zawiera marker aplikacji i wersję', () => {
    saveProject('dol-4kw', { devices: [], wires: [] });
    const raw = exportSnapshot();
    const parsed = JSON.parse(raw) as { app?: string; schemaVersion?: number };
    expect(parsed.app).toBe('elector');
    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('po przełączeniu widoku na "cabinet" ustawienia UI są zapisane w localStorage', () => {
    render(<App />);
    const panel = screen.getByLabelText('Scena');
    fireEvent.click(within(panel).getByRole('button', { name: /Otwórz zadanie dol-4kw/i }));
    const ui = loadUi();
    expect(ui?.view).toBe('cabinet');
    expect(ui?.currentTaskId).toBe('dol-4kw');
  });
});
