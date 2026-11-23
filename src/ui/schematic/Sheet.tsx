import type { FC, PropsWithChildren } from 'react';

export const SHEET_W = 1000;
export const SHEET_H = 640;

interface Props {
  title?: string | undefined;
  subtitle?: string | undefined;
  stateLabel?: string | undefined;
}

/** Arkusz A3 z ramką 1–8 / A–E, siatką 10×10 i tabliczką rysunku. */
export const Sheet: FC<PropsWithChildren<Props>> = ({ title, subtitle, stateLabel, children }) => {
  const cols = Array.from({ length: 8 }, (_, i) => {
    const x0 = 26 + i * 120.5;
    return { n: String(i + 1), x: (x0 + 60).toFixed(1), tick: `M${x0.toFixed(1)} 10 V26` };
  });
  const rows = ['A', 'B', 'C', 'D', 'E'].map((l, i) => {
    const y0 = 26 + i * 120.8;
    return { l, y: (y0 + 64).toFixed(1), tick: `M10 ${y0.toFixed(1)} H26` };
  });
  return (
    <svg
      viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
      width="100%"
      role="img"
      aria-label={`Arkusz schematu ${title ?? ''}`}
      style={{ display: 'block', borderRadius: 6 }}
    >
      <defs>
        <pattern id="sr-grid" width={10} height={10} patternUnits="userSpaceOnUse">
          <circle cx={5} cy={5} r={0.7} fill="var(--schematic-theme-grid)" />
        </pattern>
      </defs>
      <rect x={0} y={0} width={SHEET_W} height={SHEET_H} fill="var(--schematic-theme-paper)" />
      <rect x={26} y={26} width={964} height={604} fill="url(#sr-grid)" />
      <rect x={10} y={10} width={980} height={620} fill="none" stroke="var(--schematic-theme-frame)" strokeWidth={1.2} />
      <rect x={10} y={10} width={980} height={16} fill="none" stroke="var(--schematic-theme-frame)" />
      <rect x={10} y={10} width={16} height={620} fill="none" stroke="var(--schematic-theme-frame)" />
      {cols.map((c) => (
        <g key={`c${c.n}`}>
          <path d={c.tick} stroke="var(--schematic-theme-frame)" />
          <text x={c.x} y={22} textAnchor="middle" fontSize={9} fill="var(--schematic-theme-muted)">
            {c.n}
          </text>
        </g>
      ))}
      {rows.map((r) => (
        <g key={`r${r.l}`}>
          <path d={r.tick} stroke="var(--schematic-theme-frame)" />
          <text x={18} y={r.y} textAnchor="middle" fontSize={9} fill="var(--schematic-theme-muted)">
            {r.l}
          </text>
        </g>
      ))}
      <rect
        x={620}
        y={580}
        width={370}
        height={50}
        fill="var(--schematic-theme-paper)"
        stroke="var(--schematic-theme-frame)"
      />
      <path d="M620 597 H990 M800 597 V630" stroke="var(--schematic-theme-frame)" />
      <text x={628} y={592} fontSize={10} fontWeight={600} fill="var(--schematic-theme-ink)">
        {title ?? '=A1 · Schemat ideowy'}
      </text>
      <text x={628} y={611} fontSize={9} fill="var(--schematic-theme-muted)">
        {subtitle ?? 'Obwód główny i sterowanie'}
      </text>
      <text x={628} y={624} fontSize={9} fill="var(--schematic-theme-muted)">
        IEC 60617 · PN-EN 81346
      </text>
      <text x={808} y={611} fontSize={9} fill="var(--schematic-theme-muted)">
        Arkusz 1 / 1
      </text>
      {stateLabel && (
        <text x={808} y={624} fontSize={9} fill="var(--schematic-theme-muted)">
          {stateLabel}
        </text>
      )}
      {children}
    </svg>
  );
};
