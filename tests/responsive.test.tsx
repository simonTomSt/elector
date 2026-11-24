import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '@/App';
import { useUiStore } from '@/store/ui';

const resetUi = (): void => {
  window.localStorage.clear();
  useUiStore.setState({
    sceneTab: 'plate',
    view: 'cabinet',
    leftOpen: true,
    rightOpen: true,
  });
};

describe('M30 – responsywność: toggle paneli', () => {
  beforeEach(resetUi);
  afterEach(resetUi);

  it('useUiStore ma toggleLeft/toggleRight które flipują stan', () => {
    useUiStore.setState({ leftOpen: true, rightOpen: true });
    useUiStore.getState().toggleLeft();
    expect(useUiStore.getState().leftOpen).toBe(false);
    useUiStore.getState().toggleRight();
    expect(useUiStore.getState().rightOpen).toBe(false);
    useUiStore.getState().toggleLeft();
    expect(useUiStore.getState().leftOpen).toBe(true);
  });

  it('setLeftOpen/setRightOpen ustawia stan jawnie', () => {
    useUiStore.getState().setLeftOpen(false);
    useUiStore.getState().setRightOpen(false);
    expect(useUiStore.getState().leftOpen).toBe(false);
    expect(useUiStore.getState().rightOpen).toBe(false);
  });

  it('w widoku z panelami TopBar renderuje toggle paneli', () => {
    useUiStore.setState({ view: 'cabinet', leftOpen: true, rightOpen: true });
    render(<App />);
    expect(screen.getByRole('button', { name: /panel lewy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /panel prawy/i })).toBeInTheDocument();
  });

  it('w widoku tasks TopBar nie renderuje toggle paneli', () => {
    useUiStore.setState({ view: 'tasks' });
    render(<App />);
    expect(screen.queryByRole('button', { name: /panel lewy/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /panel prawy/i })).toBeNull();
  });

  it('klik w toggle paneli zmienia state store', () => {
    useUiStore.setState({ view: 'cabinet', leftOpen: true, rightOpen: true });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /schowaj panel lewy/i }));
    expect(useUiStore.getState().leftOpen).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /pokaż panel lewy/i }));
    expect(useUiStore.getState().leftOpen).toBe(true);
  });

  it('Shell oznacza stan paneli przez data-left-open/data-right-open', () => {
    useUiStore.setState({ view: 'cabinet', leftOpen: true, rightOpen: false });
    const { container } = render(<App />);
    const shell = container.querySelector('.shell');
    expect(shell?.getAttribute('data-left-open')).toBe('1');
    expect(shell?.getAttribute('data-right-open')).toBe('0');
  });

  it('aria-hidden odzwierciedla stan otwarcia panelu', () => {
    useUiStore.setState({ view: 'cabinet', leftOpen: false, rightOpen: true });
    render(<App />);
    const left = screen.getByLabelText('Panel lewy');
    const right = screen.getByLabelText('Panel prawy');
    expect(left.getAttribute('aria-hidden')).toBe('true');
    expect(right.getAttribute('aria-hidden')).toBe('false');
  });
});
