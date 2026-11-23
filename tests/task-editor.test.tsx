import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { App } from '@/App';
import { useUiStore } from '@/store/ui';
import {
  POWER_CATALOG,
  parseScenarioSteps,
  selectPowerKeys,
  useTaskEditorStore,
} from '@/store/taskEditor';

const reset = (): void => {
  useUiStore.setState({ view: 'cabinet', sceneTab: 'plate' });
  useTaskEditorStore.getState().reset();
};

const switchToEditor = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Edytor zadań' }));
};

beforeEach(reset);

describe('M11 – Edytor zadań', () => {
  it('przełącza się do widoku edytora i renderuje sekcje', () => {
    render(<App />);
    switchToEditor();
    expect(screen.getByRole('region', { name: '1. Treść zadania' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '2. Scena startowa' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '3. Losowane parametry' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '4. Scenariusze testowe' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /5\. Usterki/ })).toBeInTheDocument();
  });

  it('wstawia zmienną {In} do tytułu', () => {
    render(<App />);
    switchToEditor();
    const before = useTaskEditorStore.getState().draft.title;
    // Pierwszy chip w sekcji Treść – trzy chipy {moc}/{In}/{Uster} razy dwa (tytuł+statement)
    const chips = screen.getAllByRole('button', { name: '{In}' });
    fireEvent.click(chips[0]!);
    const after = useTaskEditorStore.getState().draft.title;
    expect(after).not.toBe(before);
    expect(after).toContain('{In}');
  });

  it('toggluje moc 5,5 kW i aktualizuje params.moc.choices', () => {
    render(<App />);
    switchToEditor();
    const before = selectPowerKeys(useTaskEditorStore.getState().draft);
    expect(before).toEqual(['4']);
    fireEvent.click(screen.getByRole('button', { name: '5,5 kW' }));
    const after = selectPowerKeys(useTaskEditorStore.getState().draft);
    expect(after).toContain('5,5');
  });

  it('zmienia napięcie sterowania na 230 V AC', () => {
    render(<App />);
    switchToEditor();
    fireEvent.click(screen.getByRole('radio', { name: '230 V AC' }));
    const draft = useTaskEditorStore.getState().draft;
    expect(draft.params?.['Uster']?.choices).toEqual(['230 V AC']);
  });

  it('zmienia scenę startową na "Pusta płyta"', () => {
    render(<App />);
    switchToEditor();
    fireEvent.click(screen.getByRole('radio', { name: /Pusta płyta/ }));
    expect(useTaskEditorStore.getState().draft.scene.start).toBe('empty');
  });

  it('dodaje nowy scenariusz i renderuje go na liście', () => {
    render(<App />);
    switchToEditor();
    const before = useTaskEditorStore.getState().draft.testScenarios?.length ?? 0;
    fireEvent.click(screen.getByRole('button', { name: /Dodaj scenariusz/ }));
    const after = useTaskEditorStore.getState().draft.testScenarios?.length ?? 0;
    expect(after).toBe(before + 1);
  });

  it('pokazuje wynik run scenariusza „start-stop" jako przechodzący', () => {
    render(<App />);
    switchToEditor();
    expect(screen.getAllByText(/✓ przechodzi/).length).toBeGreaterThan(0);
  });

  it('eksportuje draft jako prawidłowy JSON', () => {
    const json = useTaskEditorStore.getState().toJson();
    const parsed = JSON.parse(json) as { id: string };
    expect(parsed.id).toBe('dol-4kw');
  });

  it('import błędnego JSON zapisuje błąd do importError', () => {
    const res = useTaskEditorStore.getState().loadFromJson('{ nie-json');
    expect(res.ok).toBe(false);
    expect(useTaskEditorStore.getState().importError).toBeTruthy();
  });

  it('import JSON niezgodny ze schematem daje listę błędów', () => {
    const res = useTaskEditorStore.getState().loadFromJson('{"id":"x"}');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.issues.length).toBeGreaterThan(0);
    }
  });

  it('parseScenarioSteps odrzuca wartości nieznane do', () => {
    const res = parseScenarioSteps('[{"do":"xxx"}]');
    expect(res.ok).toBe(false);
  });

  it('parseScenarioSteps akceptuje poprawny krok', () => {
    const res = parseScenarioSteps('[{"do":"set","tag":"-Q0","state":{"on":true}}]');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.steps).toHaveLength(1);
    }
  });

  it('podgląd dla kursanta podstawia moc za {moc}', () => {
    render(<App />);
    switchToEditor();
    act(() => {
      useTaskEditorStore.getState().setPowerChoices(['5,5']);
    });
    // Tytuł z draftu zawiera {moc}, podgląd podstawia pierwszą wybraną moc
    const matches = screen.getAllByText(/5,5 kW/);
    expect(matches.length).toBeGreaterThan(0);
    // podgląd (<strong>) powinien zawierać podstawiony tekst z tytułu
    expect(matches.some((el) => el.tagName === 'STRONG')).toBe(true);
  });

  it('POWER_CATALOG zawiera typowe moce silników', () => {
    const keys = POWER_CATALOG.map((p) => p.key);
    expect(keys).toEqual(['2,2', '3', '4', '5,5', '7,5']);
  });
});
