import type { FC, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { ResolvedDevice } from '@/sim/model';
import { mmToPx, terminalsForDevice, type DeviceBox } from './layout';
import { TerminalView } from './TerminalView';

export type TerminalHighlight = 'none' | 'source' | 'target' | 'reject';

export interface TerminalInteractions {
  highlightOf?: (ref: string) => TerminalHighlight;
  onPointerDown?: (ref: string, e: ReactPointerEvent<SVGGElement>) => void;
}

interface Props {
  rd: ResolvedDevice;
  box: DeviceBox;
  terminals?: TerminalInteractions | undefined;
}

const deviceSubtitle = (rd: ResolvedDevice): string => {
  const p = rd.type.params;
  switch (rd.type.kind) {
    case 'mcb': {
      const curve = String(p['curve'] ?? '');
      const In = String(p['In'] ?? '');
      const poles = p['poles'] ? `${p['poles']}P` : '';
      return [curve + In, poles].filter(Boolean).join(' · ');
    }
    case 'motorBreaker':
      return `${String(p['setMin'] ?? '')}–${String(p['setMax'] ?? '')} A`;
    case 'contactor':
      return `AC-3 ${String(p['Iac3'] ?? '')} A · =${String(p['Ucoil'] ?? '')} V`;
    case 'overload':
      return `${String(p['setMin'] ?? '')}–${String(p['setMax'] ?? '')} A`;
    case 'psu':
      return `${String(p['Uout'] ?? '')} V DC · ${String(p['Imax'] ?? '')} A`;
    case 'peBar':
      return 'PE';
    default:
      return '';
  }
};

const DeviceShellRect: FC<{ box: DeviceBox; children?: ReactNode }> = ({ box, children }) => {
  const x = mmToPx(box.xMm);
  const y = mmToPx(box.yMm);
  const w = mmToPx(box.wMm);
  const h = mmToPx(box.hMm);
  const shadeH = Math.min(13, h * 0.15);
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={4}
        fill="var(--scene-dev)"
        stroke="var(--scene-devEdge)"
      />
      <rect
        x={x + 2}
        y={y + 2}
        width={w - 4}
        height={shadeH}
        rx={2}
        fill="var(--scene-devShade)"
      />
      <rect
        x={x + 2}
        y={y + h - shadeH - 2}
        width={w - 4}
        height={shadeH}
        rx={2}
        fill="var(--scene-devShade)"
      />
      {children}
    </g>
  );
};

const TerminalBlock: FC<{
  rd: ResolvedDevice;
  box: DeviceBox;
  terminals?: TerminalInteractions | undefined;
}> = ({ rd, box, terminals }) => {
  const terms = terminalsForDevice(rd, box);
  return (
    <g>
      {terms.map((t, i) => {
        const ref = rd.terminalRefs[i];
        const highlight = ref && terminals?.highlightOf ? terminals.highlightOf(ref) : 'none';
        return (
          <TerminalView
            key={t.id}
            term={t}
            terminalRef={ref}
            highlight={highlight}
            onPointerDown={terminals?.onPointerDown}
          />
        );
      })}
    </g>
  );
};

const LabelAndMeta: FC<{ rd: ResolvedDevice; box: DeviceBox }> = ({ rd, box }) => {
  const x = mmToPx(box.xMm + 2.5);
  const yTag = mmToPx(box.yMm + box.hMm / 2 - 3);
  const ySub = mmToPx(box.yMm + box.hMm / 2 + 4);
  const subtitle = deviceSubtitle(rd);
  return (
    <g>
      <text
        x={x}
        y={yTag}
        fontSize={12}
        fontFamily="var(--font-mono)"
        fontWeight={600}
        fill="var(--scene-ink)"
      >
        {rd.instance.tag}
      </text>
      {subtitle && (
        <text
          x={x}
          y={ySub}
          fontSize={8}
          fontFamily="var(--font-mono)"
          fill="var(--scene-ink2)"
        >
          {subtitle}
        </text>
      )}
    </g>
  );
};

const TerminalBlockDevice: FC<{ rd: ResolvedDevice; box: DeviceBox }> = ({ rd, box }) => {
  const variant = String(rd.instance.params?.['variant'] ?? rd.type.params['variant'] ?? 'standard');
  const x = mmToPx(box.xMm);
  const y = mmToPx(box.yMm);
  const w = mmToPx(box.wMm);
  const h = mmToPx(box.hMm);
  const fill =
    variant === 'PE'
      ? 'var(--wire-greenYellow-color)'
      : variant === 'N'
        ? 'var(--scene-blockN)'
        : 'var(--scene-block)';
  const ink = variant === 'standard' ? 'var(--scene-ink)' : '#FFFFFF';
  const [, label] = rd.instance.tag.split(':');
  const stripeX = mmToPx(box.xMm + box.wMm / 2 - 1.25);
  const stripeW = mmToPx(2.5);
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={1.5}
        fill={fill}
        stroke="var(--scene-devEdge)"
        strokeWidth={0.8}
      />
      {variant === 'PE' && (
        <rect
          x={stripeX}
          y={y}
          width={stripeW}
          height={h}
          fill="var(--wire-greenYellow-stripe)"
        />
      )}
      <text
        x={x + w / 2}
        y={y + h / 2 + 2}
        textAnchor="middle"
        fontSize={7}
        fontFamily="var(--font-mono)"
        fontWeight={600}
        fill={ink}
      >
        {label ?? ''}
      </text>
    </g>
  );
};

const PeBarDevice: FC<{ rd: ResolvedDevice; box: DeviceBox }> = ({ rd, box }) => {
  const x = mmToPx(box.xMm);
  const y = mmToPx(box.yMm);
  const w = mmToPx(box.wMm);
  const h = mmToPx(box.hMm);
  const stripeY = y + h * 0.38;
  const stripeH = h * 0.22;
  return (
    <g>
      <text
        x={x}
        y={y - 3}
        fontSize={9}
        fontFamily="var(--font-mono)"
        fontWeight={600}
        fill="var(--scene-label)"
      >
        {rd.instance.tag}
      </text>
      <rect
        x={x}
        y={y + h * 0.15}
        width={w}
        height={h * 0.65}
        rx={3}
        fill="var(--wire-greenYellow-color)"
      />
      <rect
        x={x}
        y={stripeY}
        width={w}
        height={stripeH}
        fill="var(--wire-greenYellow-stripe)"
      />
    </g>
  );
};

const DEV_SKIP_FALLBACK = new Set(['terminal', 'peBar']);

export const DeviceView: FC<Props> = ({ rd, box, terminals }) => {
  const dataTag = { 'data-tag': rd.instance.tag, 'data-kind': rd.type.kind };
  if (rd.type.kind === 'terminal') {
    return (
      <g {...dataTag}>
        <TerminalBlockDevice rd={rd} box={box} />
        <TerminalBlock rd={rd} box={box} terminals={terminals} />
      </g>
    );
  }
  if (rd.type.kind === 'peBar') {
    return (
      <g {...dataTag}>
        <PeBarDevice rd={rd} box={box} />
        <TerminalBlock rd={rd} box={box} terminals={terminals} />
      </g>
    );
  }
  if (DEV_SKIP_FALLBACK.has(rd.type.kind)) return null;

  return (
    <g {...dataTag}>
      <DeviceShellRect box={box}>
        <LabelAndMeta rd={rd} box={box} />
      </DeviceShellRect>
      <TerminalBlock rd={rd} box={box} terminals={terminals} />
    </g>
  );
};
