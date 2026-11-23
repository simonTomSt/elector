import {
  forwardRef,
  type DragEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { mmToPx, PLATE } from './layout';

interface Props {
  children: ReactNode;
  doorStripHeightMm?: number;
  ariaLabel?: string;
  onDragOver?: (e: DragEvent<SVGSVGElement>) => void;
  onDragLeave?: (e: DragEvent<SVGSVGElement>) => void;
  onDrop?: (e: DragEvent<SVGSVGElement>) => void;
  onClick?: (e: MouseEvent<SVGSVGElement>) => void;
  onWheel?: (e: ReactWheelEvent<SVGSVGElement>) => void;
  onPointerDown?: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerMove?: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (e: ReactPointerEvent<SVGSVGElement>) => void;
  viewTransform?: string;
}

const GRID_MM = 9;

export const MountingPlate = forwardRef<SVGSVGElement, Props>(function MountingPlate(
  {
    children,
    doorStripHeightMm = 0,
    ariaLabel = 'Płyta montażowa',
    onDragOver,
    onDragLeave,
    onDrop,
    onClick,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    viewTransform,
  },
  ref,
) {
  const wPx = mmToPx(PLATE.wMm);
  const plateHPx = mmToPx(PLATE.hMm);
  const doorPx = mmToPx(doorStripHeightMm);
  const totalHPx = plateHPx + doorPx;
  const gridPx = mmToPx(GRID_MM);

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${wPx} ${totalHPx}`}
      width="100%"
      role="img"
      aria-label={ariaLabel}
      className="scene"
      style={{ display: 'block', maxHeight: '100%', borderRadius: 6 }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <defs>
        <pattern
          id="scene-grid"
          width={gridPx}
          height={gridPx}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx={gridPx / 2}
            cy={gridPx / 2}
            r={0.9}
            fill="var(--scene-grid)"
          />
        </pattern>
        <pattern
          id="scene-rail"
          width={15}
          height={35}
          patternUnits="userSpaceOnUse"
        >
          <rect x={3} y={14.5} width={9} height={6} rx={1.5} fill="var(--scene-railSlot)" />
        </pattern>
        <pattern id="scene-duct-h" width={5} height={3} patternUnits="userSpaceOnUse">
          <rect x={0} y={0} width={3} height={3} fill="var(--scene-finger)" />
        </pattern>
        <pattern id="scene-duct-v" width={3} height={5} patternUnits="userSpaceOnUse">
          <rect x={0} y={0} width={3} height={3} fill="var(--scene-finger)" />
        </pattern>
        <pattern
          id="scene-pe-stripe"
          width={14}
          height={6}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect x={0} y={0} width={7} height={6} fill="var(--wire-greenYellow-color)" />
          <rect x={7} y={0} width={7} height={6} fill="var(--wire-greenYellow-stripe)" />
        </pattern>
      </defs>

      <rect x={0} y={0} width={wPx} height={plateHPx} fill="var(--scene-plate)" />
      <rect x={0} y={0} width={wPx} height={plateHPx} fill="url(#scene-grid)" />

      {doorStripHeightMm > 0 && (
        <rect
          x={0}
          y={plateHPx}
          width={wPx}
          height={doorPx}
          fill="var(--theme-panel)"
          stroke="var(--theme-line)"
        />
      )}

      <g transform={viewTransform}>{children}</g>
    </svg>
  );
});
