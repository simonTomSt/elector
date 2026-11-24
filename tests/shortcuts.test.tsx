import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { App } from '@/App';
import { useUiStore } from '@/store/ui';
import { useProjectStore } from '@/store/project';
import { useHintsStore } from '@/store/hints';
import { useResultStore } from '@/store/result';

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

describe('M20 – skróty klawiaturowe 1..5', () => {
  beforeEach(resetAll);
  afterEach(() => {
    cleanup();
    resetAll();
  });

  it('1 przełącza na widok Zadania', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: '1' });
    expect(useUiStore.getState().view).toBe('tasks');
  });

  it('2 przełącza na Szafę', () => {
    render(<App />);
    useUiStore.setState({ view: 'tasks' });
    fireEvent.keyDown(window, { key: '2' });
    expect(useUiStore.getState().view).toBe('cabinet');
  });

  it('3 przełącza na Schemat', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: '3' });
    expect(useUiStore.getState().view).toBe('schematic');
  });

  it('4 przełącza na Mieszany', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: '4' });
    expect(useUiStore.getState().view).toBe('mixed');
  });

  it('5 przełącza na Edytor zadań', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: '5' });
    expect(useUiStore.getState().view).toBe('editor');
  });

  it('ignoruje skrót gdy fokus jest w input', () => {
    render(<App />);
    const initial = useUiStore.getState().view;
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: '3' });
    expect(useUiStore.getState().view).toBe(initial);
    input.remove();
  });

  it('ignoruje skrót gdy modifier (Ctrl/Alt/Meta)', () => {
    render(<App />);
    useUiStore.setState({ view: 'cabinet' });
    fireEvent.keyDown(window, { key: '3', ctrlKey: true });
    expect(useUiStore.getState().view).toBe('cabinet');
  });

  it('ignoruje gdy otwarty modal (role=dialog)', async () => {
    render(<App />);
    useUiStore.setState({ view: 'cabinet' });
    act(() => {
      useResultStore.setState({
        result: {
          value: 100,
          max: 100,
          passed: true,
          items: [],
          penalties: { loto: 0, hints: 0 },
        },
        open: true,
      });
    });
    await waitFor(() => {
      expect(document.querySelector('[role="dialog"][aria-modal="true"]')).toBeTruthy();
    });
    fireEvent.keyDown(window, { key: '3' });
    expect(useUiStore.getState().view).toBe('cabinet');
  });
});
