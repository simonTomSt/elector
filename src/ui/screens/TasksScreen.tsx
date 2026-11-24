import { useMemo, useState, type FC } from 'react';
import dol4kw from '../../../tasks/examples/dol-4kw.json';
import diagNoStart from '../../../tasks/examples/diag-no-start.json';
import dolMixed from '../../../tasks/examples/dol-mixed.json';
import dolSchematic from '../../../tasks/examples/dol-schematic.json';
import { useUiStore } from '@/store/ui';
import {
  clearProject,
  listProjectTaskIds,
  loadProgress,
  loadProject,
  saveProgress,
  type TaskProgressStatus,
} from '@/store/persist';
import { useHintsStore } from '@/store/hints';
import { useDiagnosticStore } from '@/store/diagnostic';

interface Props {
  slot?: 'palette' | 'stage' | 'right';
}

interface TaskMeta {
  id: string;
  title: string;
  type: string;
  level?: string;
  hintsTotal: number;
}

const RAW: readonly unknown[] = [dol4kw, diagNoStart, dolMixed, dolSchematic];

const toMeta = (raw: unknown): TaskMeta | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as {
    id?: unknown;
    title?: unknown;
    type?: unknown;
    level?: unknown;
    hints?: unknown;
  };
  if (typeof o.id !== 'string' || typeof o.title !== 'string' || typeof o.type !== 'string') {
    return null;
  }
  const hintsTotal = Array.isArray(o.hints) ? o.hints.length : 0;
  const meta: TaskMeta = { id: o.id, title: o.title, type: o.type, hintsTotal };
  if (typeof o.level === 'string') meta.level = o.level;
  return meta;
};

const STATUS_LABEL: Record<TaskProgressStatus, string> = {
  'nie-zaczete': 'Nie zaczęte',
  'w-toku': 'W toku',
  ukonczone: 'Ukończone',
};

const typeIcon = (t: string): string => {
  switch (t) {
    case 'cabinet':
      return '📋';
    case 'schematic':
      return '📐';
    case 'mixed':
      return '🔗';
    case 'diagnostic':
      return '🔍';
    default:
      return '📄';
  }
};

const typeLabel = (t: string): string => {
  switch (t) {
    case 'cabinet':
      return 'Szafa';
    case 'schematic':
      return 'Schemat';
    case 'mixed':
      return 'Mieszane';
    case 'diagnostic':
      return 'Diagnostyka';
    default:
      return t;
  }
};

export const TasksScreen: FC<Props> = ({ slot = 'stage' }) => {
  const setView = useUiStore((s) => s.setView);
  const setCurrentTaskId = useUiStore((s) => s.setCurrentTaskId);

  const tasks = useMemo(
    () => RAW.map(toMeta).filter((m): m is TaskMeta => m !== null),
    [],
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_refresh, setRefresh] = useState(0);
  const progress = loadProgress();
  const savedIds = new Set(listProjectTaskIds());

  if (slot !== 'stage') return null;

  const open = (id: string, type: string): void => {
    setCurrentTaskId(id);
    const view =
      type === 'schematic'
        ? 'schematic'
        : type === 'mixed'
          ? 'mixed'
          : 'cabinet';
    setView(view);
  };

  const reset = (id: string): void => {
    clearProject(id);
    const p = loadProgress();
    const rest = { ...p };
    delete rest[id];
    saveProgress(rest);
    useHintsStore.getState().reset();
    useDiagnosticStore.getState().reset();
    setRefresh((n) => n + 1);
  };

  return (
    <div
      style={{
        padding: '24px 32px',
        overflow: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <h2 style={{ marginTop: 0, color: 'var(--theme-fg)' }}>Wybierz zadanie</h2>
      <p style={{ color: 'var(--theme-muted)', marginTop: 4 }}>
        Twój postęp jest zapisywany automatycznie w tej przeglądarce.
      </p>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '16px 0 0 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}
      >
        {tasks.map((t) => {
          const entry = progress[t.id];
          const status: TaskProgressStatus = entry?.status ?? 'nie-zaczete';
          const revealedHints = savedIds.has(t.id)
            ? (loadProject(t.id)?.revealedHintIds?.length ?? 0)
            : 0;
          return (
            <li
              key={t.id}
              data-testid={`task-card-${t.id}`}
              style={{
                border: '1px solid var(--theme-border)',
                borderRadius: 8,
                padding: 12,
                background: 'var(--theme-panel)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <button
                type="button"
                aria-label={`Otwórz zadanie ${t.id}`}
                onClick={() => open(t.id, t.type)}
                style={{
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: 'var(--theme-fg)',
                  cursor: 'pointer',
                }}
              >
                <div className="mono" style={{ color: 'var(--theme-muted)', fontSize: 12 }}>
                  {t.id} · {typeIcon(t.type)} {typeLabel(t.type)}
                  {t.level ? ` · ${t.level}` : ''}
                </div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{t.title}</div>
              </button>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ color: 'var(--theme-muted)', fontSize: 12 }}>
                  {STATUS_LABEL[status]}
                  {typeof entry?.score === 'number' ? ` · ${entry.score}/100` : ''}
                  {revealedHints > 0 && t.hintsTotal > 0
                    ? ` · podpowiedzi: ${revealedHints}/${t.hintsTotal}`
                    : ''}
                </span>
                {entry || savedIds.has(t.id) ? (
                  <button
                    type="button"
                    onClick={() => reset(t.id)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--theme-border)',
                      color: 'var(--theme-fg)',
                      borderRadius: 4,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Zacznij od nowa
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
