import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '@/App';

describe('Powłoka aplikacji', () => {
  it('renderuje TopBar, trzy panele i przełącznik motywu', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByLabelText('Panel lewy')).toBeInTheDocument();
    expect(screen.getByLabelText('Scena')).toBeInTheDocument();
    expect(screen.getByLabelText('Panel prawy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Przełącz motyw/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sprawdź rozwiązanie' })).toBeInTheDocument();
  });

  it('ustawia data-theme na elemencie documentElement', () => {
    render(<App />);
    expect(document.documentElement.dataset['theme']).toMatch(/dark|light/);
  });
});
