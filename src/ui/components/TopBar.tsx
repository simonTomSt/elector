import { useMemo, useRef, useState, type FC } from 'react';
import type { ThemeName } from '@/ui/theme/tokens';
import { resolveState, useProjectStore } from '@/store/project';
import { useSimStore, SPEEDS, type SimSpeed } from '@/store/sim';
import { useUiStore, type SceneTab } from '@/store/ui';
import { useMeterStore } from '@/store/meter';
import {
  exportSnapshot,
  importSnapshot,
  loadProgress,
  saveProgress,
} from '@/store/persist';
import { validateLive } from '@/validation/live';
import { computeScore } from '@/validation/scoring';
import { useResultStore } from '@/store/result';
import { useLotoStore } from '@/store/loto';
import { useHintsStore } from '@/store/hints';
import { useDiagnosticStore } from '@/store/diagnostic';
import { ReportFaultModal } from './ReportFaultModal';
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
  const leftOpen = useUiStore((s) => s.leftOpen);
  const rightOpen = useUiStore((s) => s.rightOpen);
  const toggleLeft = useUiStore((s) => s.toggleLeft);
  const toggleRight = useUiStore((s) => s.toggleRight);
  const showPanelToggles = view !== 'tasks';
  const meterOpen = useMeterStore((s) => s.open);
  const toggleMeter = useMeterStore((s) => s.togglePanel);
  const setResult = useResultStore((s) => s.setResult);
  const lotoIncidents = useLotoStore((s) => s.incidentCount);
  const [reportOpen, setReportOpen] = useState(false);
  const revealedHintIds = useHintsStore((s) => s.revealedIds);
  const savedAt = useProjectStore((s) => s.savedAt);
  const revealHint = useHintsStore((s) => s.reveal);
  const totalHints = task?.hints?.length ?? 0;
  const nextHint = task?.hints?.find((h) => !revealedHintIds.includes(h.id));

  const project = useMemo(() => {
    if (!task || !library) return null;
    return resolveState({ devices, wires, library });
  }, [task, library, devices, wires]);

  const onSimToggle = (): void => {
    if (simOn) {
      turnOff();
    } else if (project) {
      const initial =
        task?.type === 'diagnostic'
          ? useDiagnosticStore.getState().deviceFaultStates(task)
          : undefined;
      turnOn(project, initial);
    }
  };

  const onCheckSolution = (): void => {
    if (!task || !library || !project) return;
    const validation = validateLive(task.requirements, project, undefined, {
      task,
      devices: library,
    });
    const score = computeScore(task, validation, {
      lotoIncidents,
      hintsUsed: revealedHintIds.length,
      revealedHints: revealedHintIds,
    });
    setResult(score);
    const now = Date.now();
    const prog = loadProgress();
    const prev = prog[task.id];
    const entry = {
      status: score.passed ? ('ukonczone' as const) : ('w-toku' as const),
      updatedAt: now,
      score: score.value,
      ...(score.passed
        ? { completedAt: now }
        : prev?.completedAt !== undefined
          ? { completedAt: prev.completedAt }
          : {}),
    };
    saveProgress({ ...prog, [task.id]: entry });
  };

  const seconds = Math.floor(simT / 1000);
  const ms = simT - seconds * 1000;
  const mm = Math.floor(seconds / 60);
  const ss = seconds - mm * 60;
  const timeLabel = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')},${String(ms).padStart(3, '0')}`;

  return (
    <>
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
      {showPanelToggles && (
        <div className="topbar__panels" role="group" aria-label="Panele">
          <button
            type="button"
            className={`topbar__theme ${leftOpen ? 'is-active' : ''}`}
            onClick={toggleLeft}
            aria-pressed={leftOpen}
            aria-label={leftOpen ? 'Schowaj panel lewy' : 'Pokaż panel lewy'}
            title="Panel lewy (paleta)"
          >
            ◧
          </button>
          <button
            type="button"
            className={`topbar__theme ${rightOpen ? 'is-active' : ''}`}
            onClick={toggleRight}
            aria-pressed={rightOpen}
            aria-label={rightOpen ? 'Schowaj panel prawy' : 'Pokaż panel prawy'}
            title="Panel prawy (inspektor)"
          >
            ◨
          </button>
        </div>
      )}
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
            title="Szafa (skrót: 2)"
          >
            Szafa
          </button>
          <button
            type="button"
            className={view === 'schematic' ? 'is-active' : ''}
            onClick={() => setView('schematic')}
            title="Schemat (skrót: 3)"
          >
            Schemat
          </button>
          <button
            type="button"
            className={view === 'mixed' ? 'is-active' : ''}
            onClick={() => setView('mixed')}
            title="Szafa + schemat (skrót: 4)"
          >
            Szafa + schemat
          </button>
          <button
            type="button"
            className={view === 'editor' ? 'is-active' : ''}
            onClick={() => setView('editor')}
            title="Edytor zadań (skrót: 5)"
          >
            Edytor zadań
          </button>
          <button
            type="button"
            className={view === 'tasks' ? 'is-active' : ''}
            onClick={() => setView('tasks')}
            title="Wybór zadania (skrót: 1)"
          >
            Zadania
          </button>
        </div>
        <SnapshotControls />
        {savedAt && task && (
          <span
            aria-live="polite"
            style={{
              color: 'var(--theme-muted)',
              fontSize: 12,
              padding: '0 6px',
            }}
            title={new Date(savedAt).toLocaleString('pl-PL')}
          >
            Zapisano
          </span>
        )}
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
          onClick={() => {
            const ev = new KeyboardEvent('keydown', { key: '?' });
            window.dispatchEvent(ev);
          }}
          aria-label="Skróty klawiaturowe"
          title="Skróty klawiaturowe (?)"
        >
          ?
        </button>
        <button
          type="button"
          className="topbar__theme"
          onClick={onToggleTheme}
          aria-label={`Przełącz motyw (obecny: ${theme === 'dark' ? 'ciemny' : 'jasny'})`}
        >
          {theme === 'dark' ? '☾' : '☀'}
        </button>
        {task?.type === 'diagnostic' && (
          <button
            type="button"
            className="topbar__theme"
            onClick={() => setReportOpen(true)}
            title="Zgłoś znalezioną usterkę"
          >
            🔍 Zgłoś usterkę
          </button>
        )}
        {totalHints > 0 && (
          <button
            type="button"
            className="topbar__theme"
            onClick={() => {
              if (nextHint) revealHint(nextHint.id);
            }}
            disabled={!nextHint}
            title={
              nextHint
                ? 'Odsłoń kolejną podpowiedź (wpływa na wynik)'
                : 'Wszystkie podpowiedzi zostały odsłonięte'
            }
          >
            💡 Podpowiedź ({revealedHintIds.length}/{totalHints})
          </button>
        )}
        {task?.type !== 'diagnostic' && (
          <button
            type="button"
            className="topbar__cta"
            onClick={onCheckSolution}
            disabled={!project}
          >
            Sprawdź rozwiązanie
          </button>
        )}
      </div>
    </header>
    <ReportFaultModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </>
  );
};

const SnapshotControls: FC = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onExport = (): void => {
    const data = exportSnapshot();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elector-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File): Promise<void> => {
    const text = await file.text();
    const ok = importSnapshot(text);
    if (ok) {
      window.location.reload();
    } else {
      window.alert('Nie udało się wczytać snapshotu – zły format lub wersja.');
    }
  };

  return (
    <div className="topbar__snapshot" role="group" aria-label="Snapshot">
      <button
        type="button"
        className="topbar__theme"
        onClick={onExport}
        title="Eksportuj pełny snapshot do pliku JSON"
      >
        ⬇ Eksport
      </button>
      <button
        type="button"
        className="topbar__theme"
        onClick={() => inputRef.current?.click()}
        title="Wczytaj snapshot z pliku JSON"
      >
        ⬆ Import
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImport(f);
          e.target.value = '';
        }}
        aria-label="Wczytaj snapshot"
      />
    </div>
  );
};
