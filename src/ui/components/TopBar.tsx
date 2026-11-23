import type { FC } from 'react';
import type { ThemeName } from '@/ui/theme/tokens';
import './TopBar.css';

type Props = {
  theme: ThemeName;
  onToggleTheme: () => void;
};

export const TopBar: FC<Props> = ({ theme, onToggleTheme }) => (
  <header className="topbar" role="banner">
    <div className="topbar__left">
      <span className="topbar__logo" aria-hidden="true">
        ⚡
      </span>
      <span className="topbar__meta mono">Zadanie 1 z 4 · cabinet</span>
      <span className="topbar__title">Rozruch bezpośredni silnika 4 kW</span>
    </div>
    <nav className="topbar__steps" aria-label="Postęp zadania">
      <ol>
        <li>Schemat</li>
        <li className="is-active">Montaż</li>
        <li>Okablowanie</li>
        <li>Test</li>
      </ol>
    </nav>
    <div className="topbar__right">
      <div className="topbar__views" role="group" aria-label="Widok">
        <button type="button" className="is-active">
          Szafa
        </button>
        <button type="button" disabled>
          Schemat
        </button>
        <button type="button" disabled>
          Szafa + schemat
        </button>
      </div>
      <label className="topbar__sim">
        <input type="checkbox" />
        <span>Symulacja</span>
      </label>
      <button
        type="button"
        className="topbar__theme"
        onClick={onToggleTheme}
        aria-label={`Przełącz motyw (obecny: ${theme === 'dark' ? 'ciemny' : 'jasny'})`}
      >
        {theme === 'dark' ? '☾' : '☀'}
      </button>
      <button type="button" className="topbar__cta">
        Sprawdź rozwiązanie
      </button>
    </div>
  </header>
);
