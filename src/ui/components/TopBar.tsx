import { useMemo, type FC } from 'react';
import type { ThemeName } from '@/ui/theme/tokens';
import { resolveState, useProjectStore } from '@/store/project';
import { useSimStore, SPEEDS, type SimSpeed } from '@/store/sim';
import { useUiStore, type SceneTab } from '@/store/ui';
import { useMeterStore } from '@/store/meter';
import './TopBar.css';

type Props = {
  theme: ThemeName;
  onToggleTheme: () => void;
};

const SCENE_TABS: readonly { id: SceneTab; label: string; disabled?: boolean }[] = [
  { id: 'plate', label: 'Płyta montażowa' },
  { id: 'door', label: 'Drzwi' },
  { id: 'terminals', label: 'Listwy i przyłącza', disabled: true },
  { id: 'preview3d', label: 'Podgląd 3D', disabled: true },
];

const SPEED_LABEL: Record<SimSpeed, string> = {
  0.01: '0,01×',
  0.1: '0,1×',
  1: '1×',
};

export const TopBar: FC<Props> = ({ theme, onToggleTheme }) => {
  const task = useProjectStore((s) => s.task);
  const library = useProjectStore((s) => s.library);
  const devices = useProjectStore((s) => s.devices);
  const wires = useProjectStore((s) => s.wires);
  const simOn = useSimStore((s) => s.on);
  const simRunning = useSimStore((s) => s.running);
  const simSpeed = useSimStore((s) => s.speed);
  const simT = useSimStore((s) => s.view.t);
  const turnOn = useSimStore((s) => s.turnOn);
  const turnOff = useSimStore((s) => s.turnOff);
  const togglePlay = useSimStore((s) => s.togglePlay);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const stepOnce = useSimStore((s) => s.stepOnce);
  const sceneTab = useUiStore((s) => s.sceneTab);
  const setSceneTab = useUiStore((s) => s.setSceneTab);
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);
  const meterOpen = useMeterStore((s) => s.open);
  const toggleMeter = useMeterStore((s) => s.togglePanel);

  const project = useMemo(() => {
    if (!task || !library) return null;
    return resolveState({ devices, wires, library });
  }, [task, library, devices, wires]);

  const onSimToggle = (): void => {
    if (simOn) {
      turnOff();
    } else if (project) {
      turnOn(project);
    }
  };

  const seconds = Math.floor(simT / 1000);
  const ms = simT - seconds * 1000;
  const mm = Math.floor(seconds / 60);
  const ss = seconds - mm * 60;
  const timeLabel = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')},${String(ms).padStart(3, '0')}`;

  return (
    <header className="topbar" role="banner">
      <div className="topbar__left">
        <span className="topbar__logo" aria-hidden="true">⚡</span>
        <span className="topbar__meta mono">Zadanie 1 z 4 · {task?.type ?? 'cabinet'}</span>
        <span className="topbar__title">{task?.title ?? ''}</span>
      </div>
      <nav className="topbar__steps" aria-label="Postęp zadania">
        <ol>
          <li>Schemat</li>
          <li>Montaż</li>
          <li className="is-active">Okablowanie</li>
          <li className={simOn ? 'is-active' : ''}>Test</li>
        </ol>
      </nav>
      <nav className="topbar__scene-tabs" aria-label="Widok sceny">
        {SCENE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={sceneTab === t.id ? 'is-active' : ''}
            onClick={() => setSceneTab(t.id)}
            disabled={t.disabled}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="topbar__right">
        <div className="topbar__views" role="group" aria-label="Widok">
          <button
            type="button"
            className={view === 'cabinet' ? 'is-active' : ''}
            onClick={() => setView('cabinet')}
          >
            Szafa
          </button>
          <button
            type="button"
            className={view === 'schematic' ? 'is-active' : ''}
            onClick={() => setView('schematic')}
          >
            Schemat
          </button>
          <button type="button" disabled title="Tryb mieszany będzie w etapie M10">
            Szafa + schemat
          </button>
        </div>
        {simOn && (
          <div className="topbar__sim-ctl" role="group" aria-label="Sterowanie symulacją">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={simRunning ? 'Pauza' : 'Wznów'}
              className="topbar__sim-btn"
            >
              {simRunning ? '⏸' : '▶'}
            </button>
            <button
              type="button"
              onClick={() => stepOnce(10)}
              aria-label="Krok 10 ms"
              className="topbar__sim-btn"
              disabled={simRunning}
            >
              ⏭
            </button>
            <div className="topbar__sim-speed" role="group" aria-label="Tempo symulacji">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={simSpeed === s ? 'is-active' : ''}
                  onClick={() => setSpeed(s)}
                >
                  {SPEED_LABEL[s]}
                </button>
              ))}
            </div>
            <span className="topbar__sim-time mono" aria-label="Czas symulacji">
              t = {timeLabel}
            </span>
          </div>
        )}
        <button
          type="button"
          className={`topbar__theme ${meterOpen ? 'is-active' : ''}`}
          onClick={toggleMeter}
          aria-label={meterOpen ? 'Schowaj multimetr' : 'Pokaż multimetr'}
          aria-pressed={meterOpen}
          title="Multimetr"
        >
          ⌧
        </button>
        <label className="topbar__sim">
          <input
            type="checkbox"
            checked={simOn}
            onChange={onSimToggle}
            disabled={!project}
            aria-label="Symulacja"
          />
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
};
