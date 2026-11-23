import type { FC } from 'react';
import type { WireColor, WireCrossSection } from '@/domain/types';
import { useProjectStore } from '@/store/project';
import './SpoolToolbar.css';

const SECTIONS: { value: WireCrossSection; label: string }[] = [
  { value: 0.75, label: '0,75' },
  { value: 1, label: '1' },
  { value: 1.5, label: '1,5' },
  { value: 2.5, label: '2,5' },
];

const COLORS: { value: WireColor; name: string; swatch: string }[] = [
  { value: 'brown', name: 'brązowy', swatch: 'var(--wire-brown-color)' },
  { value: 'black', name: 'czarny', swatch: 'var(--wire-black-color)' },
  { value: 'grey', name: 'szary', swatch: 'var(--wire-grey-color)' },
  { value: 'blue', name: 'niebieski', swatch: 'var(--wire-blue-color)' },
  { value: 'greenYellow', name: 'żółto-zielony', swatch: 'var(--wire-greenYellow-color)' },
  { value: 'darkBlue', name: 'ciemnoniebieski', swatch: 'var(--wire-darkBlue-color)' },
];

export const SpoolToolbar: FC = () => {
  const spool = useProjectStore((s) => s.spool);
  const setSpool = useProjectStore((s) => s.setSpool);
  const draft = useProjectStore((s) => s.draft);
  return (
    <div
      className="spool-toolbar"
      role="toolbar"
      aria-label="Szpula przewodu"
      data-active={draft ? '1' : '0'}
    >
      <span className="spool-toolbar__title">Szpula</span>
      <div className="spool-toolbar__group" role="radiogroup" aria-label="Przekrój">
        <span className="spool-toolbar__group-label">Przekrój</span>
        {SECTIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={spool.cs === s.value}
            className="spool-toolbar__section"
            data-selected={spool.cs === s.value ? '1' : '0'}
            onClick={() => setSpool({ cs: s.value })}
          >
            {s.label}
          </button>
        ))}
        <span className="spool-toolbar__unit">mm²</span>
      </div>
      <div className="spool-toolbar__group" role="radiogroup" aria-label="Kolor izolacji">
        <span className="spool-toolbar__group-label">Kolor</span>
        {COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={spool.color === c.value}
            aria-label={c.name}
            title={c.name}
            className="spool-toolbar__color"
            data-selected={spool.color === c.value ? '1' : '0'}
            onClick={() => setSpool({ color: c.value })}
          >
            <span className="spool-toolbar__swatch" style={{ background: c.swatch }} />
          </button>
        ))}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={spool.ferrule}
        className="spool-toolbar__ferrule"
        data-selected={spool.ferrule ? '1' : '0'}
        onClick={() => setSpool({ ferrule: !spool.ferrule })}
      >
        Tulejki: {spool.ferrule ? 'wł.' : 'wył.'}
      </button>
    </div>
  );
};
