import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { resolveState, useProjectStore } from '@/store/project';
import { useSimStore } from '@/store/sim';
import { useMeterStore, METER_RANGES, type HistoryEntry } from '@/store/meter';
import { measureMeter, type MeterRange, type MeterReading } from '@/sim/meter';
import './Meter.css';

interface ProbeRowProps {
  idx: 0 | 1;
  label: string;
  probe: string | null;
  color: 'red' | 'black';
}

const ProbeRow: FC<ProbeRowProps> = ({ idx, label, probe, color }) => {
  const pickActive = useMeterStore((s) => s.pickActive);
  const startPick = useMeterStore((s) => s.startPick);
  const cancelPick = useMeterStore((s) => s.cancelPick);
  const attachProbe = useMeterStore((s) => s.attachProbe);
  const active = pickActive === idx;
  return (
    <div>
      <span className={`meter__jack meter__jack--${color}`} />
      <span>sonda {label}: {probe ?? '—'}</span>
      <button
        type="button"
        className={`meter__probe-btn ${active ? 'is-active' : ''}`}
        onClick={() => (active ? cancelPick() : startPick(idx))}
      >
        {active ? 'Anuluj' : probe ? 'Zmień' : 'Przyłóż'}
      </button>
      {probe && !active && (
        <button
          type="button"
          className="meter__probe-btn"
          onClick={() => attachProbe(idx, null)}
        >
          ×
        </button>
      )}
    </div>
  );
};

const RANGE_LABEL: Record<MeterRange, string> = {
  off: 'OFF',
  vac: 'V~',
  vdc: 'V=',
  ohm: 'Ω',
  cont: '·)))',
  aac: 'A~',
};

const formatValue = (r: MeterReading, relRef: number | null): string => {
  if (r.value === '—') return '—';
  if (r.value === 'OL') return 'OL';
  if (r.value === 'BLOK') return 'BLOK';
  let n = r.value;
  if (relRef !== null) n = n - relRef;
  if (r.range === 'vac' || r.range === 'vdc') {
    return `${n.toFixed(2).replace('.', ',')} ${r.unit}`;
  }
  if (r.range === 'ohm' || r.range === 'cont') {
    return `${n.toFixed(1).replace('.', ',')} ${r.unit}`;
  }
  if (r.range === 'aac') {
    return `${n.toFixed(2).replace('.', ',')} ${r.unit}`;
  }
  return `${n}`;
};

export const Meter: FC = () => {
  const open = useMeterStore((s) => s.open);
  const x = useMeterStore((s) => s.x);
  const y = useMeterStore((s) => s.y);
  const range = useMeterStore((s) => s.range);
  const probes = useMeterStore((s) => s.probes);
  const hold = useMeterStore((s) => s.hold);
  const relRef = useMeterStore((s) => s.relRef);
  const rel = useMeterStore((s) => s.rel);
  const minmax = useMeterStore((s) => s.minmax);
  const history = useMeterStore((s) => s.history);
  const setPosition = useMeterStore((s) => s.setPosition);
  const cycleRange = useMeterStore((s) => s.cycleRange);
  const setRange = useMeterStore((s) => s.setRange);
  const swapProbes = useMeterStore((s) => s.swapProbes);
  const toggleHold = useMeterStore((s) => s.toggleHold);
  const toggleMinMax = useMeterStore((s) => s.toggleMinMax);
  const toggleRel = useMeterStore((s) => s.toggleRel);
  const closePanel = useMeterStore((s) => s.closePanel);
  const recordReading = useMeterStore((s) => s.recordReading);
  const clearHistory = useMeterStore((s) => s.clearHistory);

  const task = useProjectStore((s) => s.task);
  const library = useProjectStore((s) => s.library);
  const devices = useProjectStore((s) => s.devices);
  const wires = useProjectStore((s) => s.wires);
  const simOn = useSimStore((s) => s.on);
  const states = useSimStore((s) => s.view.devices);
  const simT = useSimStore((s) => s.view.t);

  const project = useMemo(() => {
    if (!task || !library) return null;
    return resolveState({ devices, wires, library });
  }, [task, library, devices, wires]);

  const reading: MeterReading | null = useMemo(() => {
    if (!project) return null;
    if (!simOn) return { range, value: '—', unit: '', probes };
    return measureMeter({ project, states, range, probes });
  }, [project, states, range, probes, simOn]);

  const [minHold, setMinHold] = useState<MeterReading | null>(null);
  const [maxHold, setMaxHold] = useState<MeterReading | null>(null);
  const [displayed, setDisplayed] = useState<MeterReading | null>(null);

  useEffect(() => {
    if (!reading) return;
    if (!hold) setDisplayed(reading);
    if (minmax && typeof reading.value === 'number') {
      const v = reading.value;
      setMinHold((prev) =>
        prev && typeof prev.value === 'number' && prev.value <= v ? prev : reading,
      );
      setMaxHold((prev) =>
        prev && typeof prev.value === 'number' && prev.value >= v ? prev : reading,
      );
    }
    if (!minmax) {
      setMinHold(null);
      setMaxHold(null);
    }
  }, [reading, hold, minmax]);

  // Dragging the whole meter panel
  const dragRef = useRef<{ startX: number; startY: number; x0: number; y0: number } | null>(
    null,
  );
  const onHeaderDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, x0: x, y0: y };
    (e.currentTarget as unknown as Element).setPointerCapture(e.pointerId);
  };
  const onHeaderMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const d = dragRef.current;
    if (!d) return;
    setPosition(Math.max(0, d.x0 + (e.clientX - d.startX)), Math.max(0, d.y0 + (e.clientY - d.startY)));
  };
  const onHeaderUp = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (dragRef.current) {
      (e.currentTarget as unknown as Element).releasePointerCapture?.(e.pointerId);
    }
    dragRef.current = null;
  };

  const onRecord = (): void => {
    if (!displayed) return;
    const entry: HistoryEntry = { t: simT, reading: displayed };
    recordReading(entry);
  };

  if (!open) return null;

  const current = displayed ?? reading;
  const lcdText = current ? formatValue(current, rel ? relRef : null) : '—';
  const contLit = current?.continuity === true;

  return (
    <div
      className="meter"
      style={{ left: x, top: y }}
      role="dialog"
      aria-label="Multimetr"
    >
      <div
        className="meter__header"
        onPointerDown={onHeaderDown}
        onPointerMove={onHeaderMove}
        onPointerUp={onHeaderUp}
        onPointerCancel={onHeaderUp}
      >
        <span className="meter__title mono">MULTIMETR</span>
        <button
          type="button"
          className="meter__close"
          onClick={closePanel}
          aria-label="Zamknij miernik"
        >
          ×
        </button>
      </div>

      <div className={`meter__lcd ${contLit ? 'is-cont' : ''}`}>
        <span className="meter__lcd-range mono">{RANGE_LABEL[range]}</span>
        <span className="meter__lcd-value mono" data-testid="meter-lcd">
          {lcdText}
        </span>
        <span className="meter__lcd-flags mono">
          {hold && <em>HOLD</em>}
          {minmax && <em>MIN/MAX</em>}
          {rel && <em>REL</em>}
          {contLit && <em>·)))</em>}
        </span>
      </div>

      {minmax && (minHold || maxHold) && (
        <div className="meter__mm mono">
          <span>MIN: {minHold ? formatValue(minHold, null) : '—'}</span>
          <span>MAX: {maxHold ? formatValue(maxHold, null) : '—'}</span>
        </div>
      )}

      <div className="meter__dial" role="radiogroup" aria-label="Pozycja pokrętła">
        {METER_RANGES.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={range === r}
            className={`meter__dial-btn ${range === r ? 'is-active' : ''}`}
            onClick={() => setRange(r)}
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
      </div>

      <div className="meter__row">
        <button type="button" onClick={() => cycleRange(-1)}>◀</button>
        <button type="button" onClick={() => cycleRange(1)}>▶</button>
        <button
          type="button"
          className={hold ? 'is-active' : ''}
          onClick={toggleHold}
        >
          HOLD
        </button>
        <button
          type="button"
          className={minmax ? 'is-active' : ''}
          onClick={toggleMinMax}
        >
          MIN/MAX
        </button>
        <button
          type="button"
          className={rel ? 'is-active' : ''}
          onClick={() =>
            toggleRel(typeof current?.value === 'number' ? current.value : null)
          }
        >
          REL
        </button>
      </div>

      <div className="meter__jacks mono">
        <ProbeRow idx={0} label="czerwona" probe={probes[0]} color="red" />
        <ProbeRow idx={1} label="czarna" probe={probes[1]} color="black" />
        <button type="button" onClick={swapProbes}>Zamień</button>
      </div>

      <div className="meter__row">
        <button type="button" onClick={onRecord} disabled={!current}>
          Zapisz pomiar
        </button>
        <button type="button" onClick={clearHistory} disabled={history.length === 0}>
          Wyczyść
        </button>
      </div>

      {history.length > 0 && (
        <ul className="meter__history mono">
          {history.slice(-5).map((h, i) => (
            <li key={`${h.t}-${i}`}>
              <span>t={Math.round(h.t)} ms</span>
              <span>{RANGE_LABEL[h.reading.range]}</span>
              <span>{formatValue(h.reading, null)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
