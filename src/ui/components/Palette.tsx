import { useMemo, useState, type FC } from 'react';
import type { DeviceType } from '@/domain/types';
import type { DeviceLibrary } from '@/tasks/devices';
import './Palette.css';

export const PALETTE_DND_TYPE = 'application/x-elector-type-id';

interface Props {
  library: DeviceLibrary;
  paletteIds: readonly string[];
  onDragStartType?: (typeId: string) => void;
  onDragEndType?: () => void;
  draggingTypeId?: string | null;
}

interface Thumb {
  tw: number;
  tx: number;
  dots: { cx: number }[];
  lever: boolean;
  win: boolean;
}

const buildThumb = (type: DeviceType): Thumb => {
  const mods = Math.max(1, type.widthMm / 18);
  const tw = Math.min(40, Math.max(12, mods * 9));
  const tx = (44 - tw) / 2;
  const topTerms = type.terminals.filter((t) => t.side !== 'bottom' && t.side !== 'front');
  const poles = Math.max(1, Math.min(5, topTerms.length || 1));
  const dots = Array.from({ length: poles }, (_, i) => ({
    cx: tx + (tw * (i + 0.5)) / poles,
  }));
  const lever = type.kind === 'mcb' || type.kind === 'motorBreaker' || type.kind === 'mainSwitch';
  const win = type.kind === 'contactor';
  return { tw, tx, dots, lever, win };
};

const metaFor = (type: DeviceType): string => {
  const mods = type.widthMm > 0 ? (type.widthMm / 18).toFixed(1).replace('.0', '') : '';
  const parts = [type.prefix];
  if (mods) parts.push(`${mods} mod.`);
  if (type.widthMm > 0) parts.push(`${type.widthMm} mm`);
  return parts.join(' · ');
};

const Thumbnail: FC<{ thumb: Thumb }> = ({ thumb }) => (
  <svg width={44} height={48} viewBox="0 0 44 48" aria-hidden="true">
    <rect
      x={thumb.tx}
      y={2}
      width={thumb.tw}
      height={44}
      rx={3}
      fill="var(--scene-dev)"
      stroke="var(--theme-line2)"
    />
    {thumb.dots.map((d, i) => (
      <g key={i}>
        <circle cx={d.cx} cy={8} r={2} fill="var(--theme-muted)" />
        <circle cx={d.cx} cy={40} r={2} fill="var(--theme-muted)" />
      </g>
    ))}
    {thumb.lever && (
      <rect
        x={thumb.tx + 3}
        y={18}
        width={thumb.tw - 6}
        height={9}
        rx={2}
        fill="var(--theme-muted)"
      />
    )}
    {thumb.win && (
      <rect
        x={18}
        y={19}
        width={8}
        height={8}
        rx={1.5}
        fill="none"
        stroke="var(--theme-muted)"
        strokeWidth={1.4}
      />
    )}
  </svg>
);

export const Palette: FC<Props> = ({
  library,
  paletteIds,
  onDragStartType,
  onDragEndType,
  draggingTypeId,
}) => {
  const [query, setQuery] = useState('');

  const items = useMemo(
    () =>
      paletteIds
        .map((id) => library.byId.get(id))
        .filter((t): t is DeviceType => Boolean(t)),
    [library, paletteIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (t) => (t.label ?? '').toLowerCase().includes(q) || t.prefix.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <div className="palette">
      <h2 className="palette__title">Paleta aparatów</h2>
      <label className="palette__search">
        <span className="visually-hidden">Szukaj aparatu</span>
        <input
          type="search"
          placeholder="Szukaj aparatu…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <ul className="palette__list" aria-label="Lista aparatów">
        {filtered.map((t) => {
          const thumb = buildThumb(t);
          const isDragging = draggingTypeId === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                className={`palette__card${isDragging ? ' is-dragging' : ''}`}
                draggable
                data-type-id={t.id}
                aria-label={`Przeciągnij na płytę: ${t.label ?? t.id}`}
                onDragStart={(e) => {
                  e.dataTransfer.setData(PALETTE_DND_TYPE, t.id);
                  e.dataTransfer.effectAllowed = 'copy';
                  onDragStartType?.(t.id);
                }}
                onDragEnd={() => onDragEndType?.()}
              >
                <span className="palette__thumb">
                  <Thumbnail thumb={thumb} />
                </span>
                <span className="palette__meta">
                  <span className="palette__name">{t.label ?? t.id}</span>
                  <span className="palette__sub mono">{metaFor(t)}</span>
                </span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="palette__empty">Brak aparatów pasujących do „{query}”.</li>
        )}
      </ul>
      <p className="palette__hint">
        Przeciągnij aparat na szynę TH35. Aparaty przyciągają się do siatki 9 mm.
      </p>
    </div>
  );
};
