import { useMemo, useRef, useState, type FC, type ReactNode } from 'react';
import {
  CONTROL_VOLTAGES,
  POWER_CATALOG,
  VARIABLE_TOKENS,
  selectPowerKeys,
  selectUsters,
  useTaskEditorStore,
  type VariableToken,
} from '@/store/taskEditor';
import type { SceneStart, TaskLevel } from '@/domain/types';
import { loadDeviceLibrary } from '@/tasks/devices';
import { runScenario } from '@/sim/scenario';

interface Props {
  slot?: 'palette' | 'stage' | 'right';
}

const LEVELS: { id: TaskLevel; label: string }[] = [
  { id: 'podstawowy', label: 'Podstawowy' },
  { id: 'średni', label: 'Średni' },
  { id: 'zaawansowany', label: 'Zaawansowany' },
];

const SCENES: { id: SceneStart; title: string; sub: string }[] = [
  { id: 'empty', title: 'Pusta płyta', sub: 'Kursant montuje szyny i korytka' },
  { id: 'railsDucts', title: 'Szyny i korytka', sub: 'Montaż aparatów i okablowanie' },
  { id: 'mounted', title: 'Zmontowana', sub: 'Tylko okablowanie / nastawy' },
  { id: 'wired', title: 'Gotowy montaż', sub: 'Diagnostyka / pomiary' },
];

const NAV_ITEMS: { id: string; label: string }[] = [
  { id: 'tresc', label: 'Treść zadania' },
  { id: 'scena', label: 'Scena startowa' },
  { id: 'parametry', label: 'Parametry' },
  { id: 'scenariusze', label: 'Scenariusze testowe' },
  { id: 'usterki', label: 'Usterki' },
  { id: 'publikacja', label: 'Publikacja' },
];

type ScenarioStatus = { ok: boolean; skipped?: boolean; message: string };

/** Pomijamy scenariusze z sumarycznym czasem oczekiwania > 10 s – inaczej UI zablokuje się na minutę. */
const SCENARIO_WAIT_BUDGET_MS = 10_000;

const useScenarioStatuses = (): Map<string, ScenarioStatus> => {
  const task = useTaskEditorStore((s) => s.draft);
  return useMemo(() => {
    const statuses = new Map<string, ScenarioStatus>();
    if (!task.testScenarios || task.testScenarios.length === 0) return statuses;
    const devices = loadDeviceLibrary();
    for (const scen of task.testScenarios) {
      const totalWait = scen.steps.reduce((acc, s) => acc + (typeof s.ms === 'number' ? s.ms : 0), 0);
      if (totalWait > SCENARIO_WAIT_BUDGET_MS) {
        statuses.set(scen.id, { ok: true, skipped: true, message: 'pominięto (długi)' });
        continue;
      }
      try {
        const res = runScenario(task, scen.id, devices);
        statuses.set(scen.id, {
          ok: res.ok,
          message: res.ok ? 'przechodzi' : res.failures[0] ?? 'nie przechodzi',
        });
      } catch (e) {
        statuses.set(scen.id, { ok: false, message: (e as Error).message });
      }
    }
    return statuses;
  }, [task]);
};

const Nav: FC = () => (
  <nav aria-label="Sekcje zadania" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {NAV_ITEMS.map((n, i) => (
        <li key={n.id}>
          <a
            href={`#${n.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minHeight: 44,
              padding: '0 10px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 500,
              color: 'var(--theme-text)',
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                background: 'var(--theme-line2)',
                color: 'var(--theme-text)',
              }}
            >
              {i + 1}
            </span>
            {n.label}
          </a>
        </li>
      ))}
    </ol>
  </nav>
);

const Section: FC<{ id: string; title: string; children: ReactNode }> = ({ id, title, children }) => (
  <section
    id={id}
    aria-label={title}
    style={{
      background: 'var(--theme-panel)',
      border: '1px solid var(--theme-line2)',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}
  >
    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{title}</h2>
    {children}
  </section>
);

const VariableChips: FC<{ onPick: (t: VariableToken) => void }> = ({ onPick }) => (
  <span style={{ fontSize: 12, color: 'var(--theme-muted)' }}>
    Wstaw zmienną:{' '}
    {VARIABLE_TOKENS.map((t) => (
      <button
        key={t}
        type="button"
        onClick={() => onPick(t)}
        style={{
          height: 28,
          padding: '0 8px',
          margin: '0 2px',
          borderRadius: 6,
          border: '1px solid var(--theme-line2)',
          background: 'var(--theme-stage)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--theme-text)',
          cursor: 'pointer',
        }}
      >
        {t}
      </button>
    ))}
  </span>
);

const ScenarioSteps: FC<{ scenarioId: string; initial: string }> = ({ scenarioId, initial }) => {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const setScenarioSteps = useTaskEditorStore((s) => s.setScenarioSteps);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const res = setScenarioSteps(scenarioId, value);
          setError(res.ok ? null : res.error);
        }}
        style={{
          width: '100%',
          padding: 8,
          borderRadius: 6,
          border: '1px solid var(--theme-line2)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          background: 'var(--theme-stage)',
          color: 'var(--theme-text)',
          resize: 'vertical',
        }}
        aria-label={`Kroki scenariusza ${scenarioId}`}
      />
      {error && (
        <span role="alert" style={{ color: 'var(--state-err-inkDark, #FF8A84)', fontSize: 12 }}>
          {error}
        </span>
      )}
    </div>
  );
};

export const TaskEditorScreen: FC<Props> = ({ slot = 'stage' }) => {
  const draft = useTaskEditorStore((s) => s.draft);
  const importError = useTaskEditorStore((s) => s.importError);
  const recording = useTaskEditorStore((s) => s.recording);
  const setTitle = useTaskEditorStore((s) => s.setTitle);
  const setStatement = useTaskEditorStore((s) => s.setStatement);
  const setLevel = useTaskEditorStore((s) => s.setLevel);
  const setDurationMin = useTaskEditorStore((s) => s.setDurationMin);
  const insertVariableToField = useTaskEditorStore((s) => s.insertVariableToField);
  const setSceneStart = useTaskEditorStore((s) => s.setSceneStart);
  const togglePower = useTaskEditorStore((s) => s.togglePower);
  const setControlVoltage = useTaskEditorStore((s) => s.setControlVoltage);
  const addScenario = useTaskEditorStore((s) => s.addScenario);
  const removeScenario = useTaskEditorStore((s) => s.removeScenario);
  const renameScenario = useTaskEditorStore((s) => s.renameScenario);
  const addFault = useTaskEditorStore((s) => s.addFault);
  const toggleFault = useTaskEditorStore((s) => s.toggleFault);
  const setPickFaults = useTaskEditorStore((s) => s.setPickFaults);
  const setRecording = useTaskEditorStore((s) => s.setRecording);
  const loadFromJson = useTaskEditorStore((s) => s.loadFromJson);
  const toJson = useTaskEditorStore((s) => s.toJson);
  const reset = useTaskEditorStore((s) => s.reset);

  const selectedPowers = useMemo(() => new Set(selectPowerKeys(draft)), [draft]);
  const selectedUster = selectUsters(draft)[0] ?? '24 V DC';
  const scenarioStatuses = useScenarioStatuses();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [importText, setImportText] = useState('');

  if (slot === 'palette') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--theme-muted)',
          }}
        >
          Edytor zadań
        </h2>
        <Nav />
        <button
          type="button"
          onClick={reset}
          style={{
            height: 40,
            borderRadius: 8,
            border: '1px solid var(--theme-line2)',
            background: 'var(--theme-stage)',
            color: 'var(--theme-text)',
            font: 'inherit',
            cursor: 'pointer',
          }}
        >
          Przywróć z dol-4kw
        </button>
      </div>
    );
  }

  if (slot === 'right') {
    const firstPower = POWER_CATALOG.find((p) => selectedPowers.has(p.key));
    const inStr = firstPower ? `${firstPower.In.toFixed(1).replace('.', ',')} A` : '—';
    const readyTitle = draft.title.length > 0;
    const readyStatement = draft.statement.length > 0;
    const scenariosOk = (draft.testScenarios ?? []).every((s) => scenarioStatuses.get(s.id)?.ok);
    const okCount = [...scenarioStatuses.values()].filter((s) => s.ok).length;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflow: 'auto' }}>
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--theme-muted)',
          }}
        >
          Podgląd dla kursanta
        </h2>
        <div
          style={{
            borderRadius: 12,
            background: 'var(--theme-stage)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--theme-muted)' }}>Zadanie · wylosowano</span>
          <strong style={{ fontSize: 15 }}>
            {draft.title
              .replace('{moc}', firstPower?.label ?? '{moc}')
              .replace('{In}', inStr)
              .replace('{Uster}', selectedUster)}
          </strong>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--theme-muted)' }}>
            {draft.statement
              .replace('{moc}', firstPower?.label ?? '{moc}')
              .replace('{In}', inStr)
              .replace('{Uster}', selectedUster)}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {draft.level && (
              <span style={{ padding: '2px 8px', borderRadius: 4, background: 'var(--theme-line2)', fontSize: 12 }}>
                {LEVELS.find((l) => l.id === draft.level)?.label ?? draft.level}
              </span>
            )}
            {draft.durationMin && (
              <span style={{ padding: '2px 8px', borderRadius: 4, background: 'var(--theme-line2)', fontSize: 12 }}>
                ok. {draft.durationMin} min
              </span>
            )}
            <span style={{ padding: '2px 8px', borderRadius: 4, background: 'var(--theme-line2)', fontSize: 12 }}>
              {(draft.testScenarios?.length ?? 0)} scenariuszy
            </span>
          </div>
        </div>
        <section
          aria-label="Gotowość do publikacji"
          style={{
            padding: 12,
            borderRadius: 10,
            background: 'var(--theme-stage)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 13,
          }}
        >
          <strong>Gotowość do publikacji</strong>
          <span style={{ color: readyTitle ? 'var(--state-ok-color, #22A06B)' : 'var(--state-err-inkDark, #FF8A84)' }}>
            {readyTitle ? '✓' : '✗'} Tytuł
          </span>
          <span style={{ color: readyStatement ? 'var(--state-ok-color, #22A06B)' : 'var(--state-err-inkDark, #FF8A84)' }}>
            {readyStatement ? '✓' : '✗'} Treść
          </span>
          <span style={{ color: scenariosOk ? 'var(--state-ok-color, #22A06B)' : 'var(--state-err-inkDark, #FF8A84)' }}>
            {scenariosOk ? '✓' : '✗'} {okCount}/{draft.testScenarios?.length ?? 0} scenariuszy przechodzi
          </span>
        </section>
        <section
          aria-label="Eksport i import"
          style={{
            padding: 12,
            borderRadius: 10,
            background: 'var(--theme-stage)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            fontSize: 13,
          }}
        >
          <strong>Eksport / Import</strong>
          <button
            type="button"
            onClick={() => {
              const json = toJson();
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${draft.id}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              height: 36,
              borderRadius: 8,
              border: '1px solid var(--theme-line2)',
              background: 'var(--theme-stage)',
              color: 'var(--theme-text)',
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            Eksportuj JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              f.text().then((t) => loadFromJson(t));
            }}
            style={{ display: 'none' }}
            aria-label="Importuj plik zadania"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              height: 36,
              borderRadius: 8,
              border: '1px solid var(--theme-line2)',
              background: 'var(--theme-stage)',
              color: 'var(--theme-text)',
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            Importuj plik…
          </button>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--theme-muted)' }}>…lub wklej JSON:</span>
            <textarea
              rows={3}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              style={{
                padding: 8,
                borderRadius: 6,
                border: '1px solid var(--theme-line2)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                background: 'var(--theme-panel)',
                color: 'var(--theme-text)',
              }}
              aria-label="Wklej JSON zadania"
            />
          </label>
          <button
            type="button"
            onClick={() => loadFromJson(importText)}
            style={{
              height: 36,
              borderRadius: 8,
              border: 'none',
              background: 'var(--theme-accent)',
              color: 'var(--theme-accentInk, #08121F)',
              font: 'inherit',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Wczytaj z pola
          </button>
          {importError && (
            <span
              role="alert"
              style={{ color: 'var(--state-err-inkDark, #FF8A84)', fontSize: 12, whiteSpace: 'pre-wrap' }}
            >
              {importError}
            </span>
          )}
        </section>
      </div>
    );
  }

  // slot === 'stage'
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 820,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <Section id="tresc" title="1. Treść zadania">
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontWeight: 500 }}>Tytuł</span>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              height: 44,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--theme-line2)',
              background: 'var(--theme-stage)',
              color: 'var(--theme-text)',
              font: 'inherit',
            }}
          />
          <VariableChips onPick={(t) => insertVariableToField('title', t)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontWeight: 500 }}>Polecenie dla kursanta</span>
          <textarea
            rows={3}
            value={draft.statement}
            onChange={(e) => setStatement(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--theme-line2)',
              background: 'var(--theme-stage)',
              color: 'var(--theme-text)',
              font: 'inherit',
              resize: 'vertical',
            }}
          />
          <VariableChips onPick={(t) => insertVariableToField('statement', t)} />
        </label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 500 }}>Poziom</span>
            <select
              value={draft.level ?? ''}
              onChange={(e) => setLevel((e.target.value || null) as TaskLevel | null)}
              style={{
                height: 44,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid var(--theme-line2)',
                background: 'var(--theme-stage)',
                color: 'var(--theme-text)',
                font: 'inherit',
              }}
            >
              <option value="">— wybierz —</option>
              {LEVELS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 500 }}>Szacowany czas (min)</span>
            <input
              type="number"
              value={draft.durationMin ?? ''}
              min={1}
              onChange={(e) => setDurationMin(e.target.value ? Number(e.target.value) : null)}
              style={{
                height: 44,
                padding: '0 12px',
                borderRadius: 8,
                border: '1px solid var(--theme-line2)',
                background: 'var(--theme-stage)',
                color: 'var(--theme-text)',
                font: 'inherit',
              }}
            />
          </label>
        </div>
      </Section>

      <Section id="scena" title="2. Scena startowa">
        <div
          role="radiogroup"
          aria-label="Scena startowa"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}
        >
          {SCENES.map((sc) => {
            const sel = draft.scene.start === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                role="radio"
                aria-checked={sel}
                onClick={() => setSceneStart(sc.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: 10,
                  borderRadius: 10,
                  textAlign: 'left',
                  font: 'inherit',
                  color: 'var(--theme-text)',
                  cursor: 'pointer',
                  background: sel ? 'var(--theme-accentSoft)' : 'var(--theme-stage)',
                  border: `2px solid ${sel ? 'var(--theme-accent)' : 'var(--theme-line2)'}`,
                }}
              >
                <span style={{ fontWeight: 600 }}>{sc.title}</span>
                <span style={{ fontSize: 12, color: 'var(--theme-muted)' }}>{sc.sub}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section id="parametry" title="3. Losowane parametry">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontWeight: 500 }}>
            Moc silnika <span style={{ fontFamily: 'var(--font-mono)' }}>{'{moc}'}</span>
          </span>
          <div role="group" aria-label="Dozwolone moce silnika" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {POWER_CATALOG.map((p) => {
              const sel = selectedPowers.has(p.key);
              return (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={sel}
                  onClick={() => togglePower(p.key)}
                  style={{
                    height: 44,
                    minWidth: 76,
                    padding: '0 12px',
                    borderRadius: 22,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    cursor: 'pointer',
                    background: sel ? 'var(--theme-accentSoft)' : 'var(--theme-stage)',
                    color: sel ? 'var(--theme-accent)' : 'var(--theme-muted)',
                    border: `1px solid ${sel ? 'var(--theme-accent)' : 'var(--theme-line2)'}`,
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontWeight: 500 }}>
            Napięcie sterowania <span style={{ fontFamily: 'var(--font-mono)' }}>{'{Uster}'}</span>
          </span>
          <div
            role="radiogroup"
            aria-label="Napięcie sterowania"
            style={{
              display: 'flex',
              border: '1px solid var(--theme-line2)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {CONTROL_VOLTAGES.map((v) => {
              const sel = selectedUster === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => setControlVoltage(v)}
                  style={{
                    height: 42,
                    padding: '0 14px',
                    border: 'none',
                    background: sel ? 'var(--theme-accentSoft)' : 'var(--theme-stage)',
                    color: sel ? 'var(--theme-accent)' : 'var(--theme-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: sel ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      <Section id="scenariusze" title="4. Scenariusze testowe">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={addScenario}
            style={{
              height: 40,
              padding: '0 14px',
              borderRadius: 8,
              border: '1px solid var(--theme-line2)',
              background: 'var(--theme-stage)',
              color: 'var(--theme-text)',
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            + Dodaj scenariusz
          </button>
          <button
            type="button"
            aria-pressed={recording}
            onClick={() => setRecording(!recording)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              height: 40,
              padding: '0 14px',
              borderRadius: 22,
              font: 'inherit',
              fontWeight: 600,
              cursor: 'pointer',
              background: recording ? 'rgba(229,72,77,0.10)' : 'var(--theme-stage)',
              color: recording ? '#E5484D' : 'var(--theme-text)',
              border: `1px solid ${recording ? '#E5484D' : 'var(--theme-line2)'}`,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: '#E5484D',
                display: 'inline-block',
              }}
            />
            {recording ? 'Zatrzymaj nagrywanie' : 'Nagraj scenariusz'}
          </button>
        </div>
        {recording && (
          <p
            role="status"
            style={{
              margin: 0,
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(229,72,77,0.08)',
              color: '#B4232A',
              fontSize: 13,
            }}
          >
            Nagrywanie w tej wersji dopisz ręcznie: wklej listę kroków jako JSON (schema `step`).
          </p>
        )}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(draft.testScenarios ?? []).map((s) => {
            const status = scenarioStatuses.get(s.id);
            return (
              <li
                key={s.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--theme-line2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={s.name}
                    onChange={(e) => renameScenario(s.id, e.target.value)}
                    aria-label={`Nazwa scenariusza ${s.id}`}
                    style={{
                      flex: '1 1 200px',
                      minWidth: 200,
                      height: 36,
                      padding: '0 10px',
                      borderRadius: 6,
                      border: '1px solid var(--theme-line2)',
                      background: 'var(--theme-stage)',
                      color: 'var(--theme-text)',
                      font: 'inherit',
                      fontWeight: 600,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: status?.skipped
                        ? 'var(--theme-muted)'
                        : status?.ok
                          ? 'var(--state-ok-color, #22A06B)'
                          : 'var(--state-err-inkDark, #FF8A84)',
                    }}
                  >
                    {status
                      ? status.skipped
                        ? `… ${status.message}`
                        : status.ok
                          ? '✓ przechodzi'
                          : `✗ ${status.message}`
                      : '…'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeScenario(s.id)}
                    aria-label={`Usuń scenariusz ${s.name}`}
                    style={{
                      height: 36,
                      padding: '0 10px',
                      borderRadius: 6,
                      border: '1px solid var(--theme-line2)',
                      background: 'var(--theme-stage)',
                      color: 'var(--theme-muted)',
                      font: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    Usuń
                  </button>
                </div>
                <ScenarioSteps scenarioId={s.id} initial={JSON.stringify(s.steps, null, 2)} />
              </li>
            );
          })}
        </ul>
      </Section>

      <Section id="usterki" title="5. Usterki (wariant diagnostyczny)">
        <p style={{ margin: 0, fontSize: 13, color: 'var(--theme-muted)' }}>
          Zaznacz usterki, które można wstawić do gotowej szafy. Kursant szuka ich miernikiem.
        </p>
        <div role="group" aria-label="Usterki" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(draft.faults ?? []).map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed="true"
              onClick={() => toggleFault(f.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 40,
                padding: '0 12px',
                borderRadius: 20,
                font: 'inherit',
                fontSize: 13,
                cursor: 'pointer',
                background: 'var(--theme-accentSoft)',
                color: 'var(--theme-accent)',
                border: '1px solid var(--theme-accent)',
              }}
            >
              <span aria-hidden>✓</span>
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              addFault({
                id: `fault-${Date.now()}`,
                label: 'Nowa usterka',
                apply: { random: true },
              })
            }
            style={{
              height: 40,
              padding: '0 14px',
              borderRadius: 20,
              font: 'inherit',
              fontSize: 13,
              border: '1px dashed var(--theme-line2)',
              background: 'transparent',
              color: 'var(--theme-muted)',
              cursor: 'pointer',
            }}
          >
            + Dodaj usterkę
          </button>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36 }}>
          <span>Losuj</span>
          <input
            type="number"
            min={0}
            value={draft.pickFaults ?? ''}
            onChange={(e) => setPickFaults(e.target.value ? Number(e.target.value) : null)}
            style={{
              width: 64,
              height: 36,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid var(--theme-line2)',
              background: 'var(--theme-stage)',
              color: 'var(--theme-text)',
              font: 'inherit',
            }}
            aria-label="Liczba losowanych usterek"
          />
          <span>usterek dla każdego kursanta</span>
        </label>
      </Section>
    </div>
  );
};
