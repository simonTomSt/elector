import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FC,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import type { Task } from '@/domain/types';
import type { ResolvedProject } from '@/sim/model';
import {
  collides,
  fitsOnRail,
  railOccupants,
  snapToGrid,
  useProjectStore,
  type RailIndex,
} from '@/store/project';
import { PALETTE_DND_TYPE } from '@/ui/components/Palette';
import {
  buildRailGeom,
  deviceBox,
  isRailMounted,
  mmToPx,
  PX_PER_MM,
  terminalPositionIndex,
  type RailGeom,
} from './layout';
import { MountingPlate } from './MountingPlate';
import { Rail } from './Rail';
import { Duct } from './Duct';
import { DeviceView } from './DeviceView';
import { WireView } from './WireView';
import { DoorStrip } from './DoorStrip';
import { pickRailForY, svgPointToMm } from './dnd';
import { DraftWireView } from './DraftWireView';
import { ZoomContext } from './zoomContext';
import type { TerminalHighlight } from './DeviceView';

interface Props {
  task: Task;
  project: ResolvedProject;
}

const DOOR_STRIP_MM = 70;
const PLATE_START_X_MM = 35;

interface GhostState {
  typeId: string;
  rail: RailIndex;
  xMm: number;
  widthMm: number;
  rect: RailGeom;
  valid: boolean;
}

export const SceneView: FC<Props> = ({ task, project }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [ghost, setGhost] = useState<GhostState | null>(null);
  const library = useProjectStore((s) => s.library);
  const devices = useProjectStore((s) => s.devices);
  const addDeviceOnRail = useProjectStore((s) => s.addDeviceOnRail);
  const moveDevice = useProjectStore((s) => s.moveDevice);
  const selectDevice = useProjectStore((s) => s.selectDevice);
  const selectedTag = useProjectStore((s) => s.selectedTag);
  const selectedWireId = useProjectStore((s) => s.selectedWireId);
  const selectWire = useProjectStore((s) => s.selectWire);
  const view = useProjectStore((s) => s.view);
  const setZoom = useProjectStore((s) => s.setZoom);
  const setPan = useProjectStore((s) => s.setPan);
  const resetView = useProjectStore((s) => s.resetView);
  const draft = useProjectStore((s) => s.draft);
  const spool = useProjectStore((s) => s.spool);
  const beginWire = useProjectStore((s) => s.beginWire);
  const updateDraftCursor = useProjectStore((s) => s.updateDraftCursor);
  const addDraftBend = useProjectStore((s) => s.addDraftBend);
  const commitWire = useProjectStore((s) => s.commitWire);
  const cancelWire = useProjectStore((s) => s.cancelWire);
  const existingWires = useProjectStore((s) => s.wires);
  const [hoverTerm, setHoverTerm] = useState<string | null>(null);
  const dragRef = useRef<{ tag: string; offsetMm: number; startX: number; startXMm: number } | null>(
    null,
  );
  const [dragTag, setDragTag] = useState<string | null>(null);
  const panRef = useRef<{ startX: number; startY: number; panX0: number; panY0: number } | null>(
    null,
  );

  const rails = useMemo(() => {
    const m = new Map<RailIndex, RailGeom>();
    (task.scene.rails ?? []).forEach((r, idx) => {
      const n = (idx + 1) as RailIndex;
      m.set(n, buildRailGeom(n, r));
    });
    return m;
  }, [task]);

  const railDevices = project.devices.filter((rd) => isRailMounted(rd.instance));
  const offPlateDevices = project.devices.filter(
    (rd) => rd.type.mount !== 'rail' && rd.type.kind !== 'supply',
  );

  const termIndex = terminalPositionIndex(project.devices, rails);

  const resolveEndpoint = (ref: string): { xMm: number; yMm: number } | undefined =>
    termIndex.get(ref);

  const canCommitTo = (ref: string): boolean => {
    if (!draft) return false;
    if (ref === draft.from) return false;
    return !existingWires.some(
      (w) =>
        (w.a === draft.from && w.b === ref) || (w.b === draft.from && w.a === ref),
    );
  };

  const highlightOf = (ref: string): TerminalHighlight => {
    if (draft) {
      if (ref === draft.from) return 'source';
      if (hoverTerm === ref) return canCommitTo(ref) ? 'target' : 'reject';
      return 'none';
    }
    return 'none';
  };

  const onTerminalPointerDown = (ref: string, e: ReactPointerEvent<SVGGElement>): void => {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const pos = termIndex.get(ref);
    if (!pos) return;
    if (!draft) {
      beginWire(ref, { xMm: pos.xMm, yMm: pos.yMm });
      return;
    }
    const result = commitWire(ref, { xMm: pos.xMm, yMm: pos.yMm });
    if (!result.ok) {
      // zły cel – zostaw draft, kursor podąża dalej
      return;
    }
  };


  const computeGhost = useCallback(
    (e: DragEvent<SVGSVGElement>): GhostState | null => {
      const typeId = e.dataTransfer.getData(PALETTE_DND_TYPE) || null;
      const effectiveType = typeId ?? ghost?.typeId ?? null;
      if (!effectiveType || !library) return null;
      const type = library.byId.get(effectiveType);
      if (!type || type.mount !== 'rail') return null;
      const svg = svgRef.current;
      if (!svg) return null;
      const local = svgPointToMm(svg, e.clientX, e.clientY, PX_PER_MM);
      if (!local) return null;
      const railIdx = pickRailForY(local.yMm, rails);
      if (!railIdx) return null;
      const geom = rails.get(railIdx);
      if (!geom) return null;
      const centeredX = local.xMm - type.widthMm / 2;
      const xMm = snapToGrid(centeredX);
      const occ = railOccupants(library, devices, railIdx);
      const railLen = task.scene.rails?.[railIdx - 1]?.lengthMm ?? 0;
      const valid =
        fitsOnRail(xMm, type.widthMm, railLen, PLATE_START_X_MM) &&
        !collides(xMm, xMm + type.widthMm, occ);
      return { typeId: effectiveType, rail: railIdx, xMm, widthMm: type.widthMm, rect: geom, valid };
    },
    [ghost?.typeId, library, devices, rails, task.scene.rails],
  );

  const onDragOver = (e: DragEvent<SVGSVGElement>): void => {
    if (!library) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const g = computeGhost(e);
    setGhost(g);
  };

  const onDragLeave = (): void => setGhost(null);

  const onDrop = (e: DragEvent<SVGSVGElement>): void => {
    e.preventDefault();
    const typeId = e.dataTransfer.getData(PALETTE_DND_TYPE);
    const target = computeGhost(e);
    if (!typeId || !target || !target.valid) {
      setGhost(null);
      return;
    }
    addDeviceOnRail(typeId, target.rail, target.xMm);
    setGhost(null);
  };

  const beginDeviceDrag = (
    tag: string,
    deviceXMm: number,
    e: ReactPointerEvent<SVGGElement>,
  ): void => {
    const svg = svgRef.current;
    if (!svg || e.button !== 0) return;
    const local = svgPointToMm(svg, e.clientX, e.clientY, PX_PER_MM);
    if (!local) return;
    e.stopPropagation();
    selectDevice(tag);
    dragRef.current = {
      tag,
      offsetMm: local.xMm - deviceXMm,
      startX: e.clientX,
      startXMm: deviceXMm,
    };
    (e.currentTarget as unknown as Element).setPointerCapture(e.pointerId);
    setDragTag(tag);
  };

  const onDevicePointerMove = (e: ReactPointerEvent<SVGGElement>): void => {
    const info = dragRef.current;
    const svg = svgRef.current;
    if (!info || !svg) return;
    if (Math.abs(e.clientX - info.startX) < 2) return;
    const local = svgPointToMm(svg, e.clientX, e.clientY, PX_PER_MM);
    if (!local) return;
    moveDevice(info.tag, local.xMm - info.offsetMm);
  };

  const endDeviceDrag = (e: ReactPointerEvent<SVGGElement>): void => {
    if (dragRef.current) {
      (e.currentTarget as unknown as Element).releasePointerCapture?.(e.pointerId);
    }
    dragRef.current = null;
    setDragTag(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (dragRef.current) {
          moveDevice(dragRef.current.tag, dragRef.current.startXMm);
          dragRef.current = null;
          setDragTag(null);
        }
        if (draft) {
          cancelWire();
          setHoverTerm(null);
        }
      }
      if (draft) {
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          addDraftBend({ xMm: draft.cursor.xMm, yMm: draft.cursor.yMm });
        }
        if (e.key === 'Enter' && hoverTerm) {
          const pos = termIndex.get(hoverTerm);
          if (pos) commitWire(hoverTerm, { xMm: pos.xMm, yMm: pos.yMm });
        }
      }
      if (e.key === '+' || e.key === '=') setZoom(view.zoom * 1.2);
      if (e.key === '-' || e.key === '_') setZoom(view.zoom / 1.2);
      if (e.key === '0') resetView();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    moveDevice,
    setZoom,
    resetView,
    view.zoom,
    draft,
    cancelWire,
    addDraftBend,
    hoverTerm,
    commitWire,
    termIndex,
  ]);

  const onWheel = (e: ReactWheelEvent<SVGSVGElement>): void => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
    setZoom(view.zoom * factor);
  };

  const onSvgPointerDown = (e: ReactPointerEvent<SVGSVGElement>): void => {
    if (e.button !== 1 && !(e.button === 0 && e.shiftKey)) return;
    e.preventDefault();
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX0: view.panXPx,
      panY0: view.panYPx,
    };
    (e.currentTarget as unknown as Element).setPointerCapture(e.pointerId);
  };

  const findNearestTerminal = (xMm: number, yMm: number): string | null => {
    let best: { ref: string; d2: number } | null = null;
    const R2 = 6 * 6;
    for (const [ref, pos] of termIndex) {
      const dx = pos.xMm - xMm;
      const dy = pos.yMm - yMm;
      const d2 = dx * dx + dy * dy;
      if (d2 <= R2 && (!best || d2 < best.d2)) best = { ref, d2 };
    }
    return best?.ref ?? null;
  };

  const onSvgPointerMove = (e: ReactPointerEvent<SVGSVGElement>): void => {
    const p = panRef.current;
    if (p) {
      setPan(p.panX0 + (e.clientX - p.startX), p.panY0 + (e.clientY - p.startY));
      return;
    }
    if (!draft) return;
    const svg = svgRef.current;
    if (!svg) return;
    const local = svgPointToMm(svg, e.clientX, e.clientY, PX_PER_MM);
    if (!local) return;
    const near = findNearestTerminal(local.xMm, local.yMm);
    setHoverTerm(near);
    if (near && near !== draft.from) {
      const pos = termIndex.get(near);
      if (pos) {
        updateDraftCursor({ xMm: pos.xMm, yMm: pos.yMm });
        return;
      }
    }
    updateDraftCursor({ xMm: local.xMm, yMm: local.yMm });
  };

  const onSvgPointerUp = (e: ReactPointerEvent<SVGSVGElement>): void => {
    if (panRef.current) {
      (e.currentTarget as unknown as Element).releasePointerCapture?.(e.pointerId);
      panRef.current = null;
    }
  };

  const viewTransform = `translate(${view.panXPx} ${view.panYPx}) scale(${view.zoom})`;

  return (
    <ZoomContext.Provider value={view.zoom}>
    <MountingPlate
      ref={svgRef}
      doorStripHeightMm={DOOR_STRIP_MM}
      ariaLabel={`Płyta montażowa – ${task.id}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          selectDevice(null);
          selectWire(null);
        }
      }}
      onWheel={onWheel}
      onPointerDown={onSvgPointerDown}
      onPointerMove={onSvgPointerMove}
      onPointerUp={onSvgPointerUp}
      viewTransform={viewTransform}
    >
      {(task.scene.ducts ?? []).map((d, i) => (
        <Duct key={`duct-${i}`} duct={d} />
      ))}

      {[...rails.values()].map((rg) => {
        const rail = task.scene.rails?.[rg.index - 1];
        if (!rail) return null;
        return (
          <Rail
            key={`rail-${rg.index}`}
            geom={rg}
            xStartMm={PLATE_START_X_MM}
            lengthMm={rail.lengthMm}
          />
        );
      })}

      <g data-layer="devices">
        {railDevices.map((rd) => {
          const box = deviceBox(rd, rails);
          if (!box) return null;
          const selected = selectedTag === rd.instance.tag;
          const beingDragged = dragTag === rd.instance.tag;
          return (
            <g
              key={rd.instance.tag}
              onClick={(e) => {
                e.stopPropagation();
                selectDevice(rd.instance.tag);
              }}
              onPointerDown={(e) => beginDeviceDrag(rd.instance.tag, box.xMm, e)}
              onPointerMove={onDevicePointerMove}
              onPointerUp={endDeviceDrag}
              onPointerCancel={endDeviceDrag}
              style={{
                cursor: beingDragged ? 'grabbing' : 'grab',
                opacity: beingDragged ? 0.7 : 1,
              }}
            >
              <DeviceView
                rd={rd}
                box={box}
                terminals={{ highlightOf, onPointerDown: onTerminalPointerDown }}
              />
              {selected && (
                <rect
                  x={mmToPx(box.xMm) - 2}
                  y={mmToPx(box.yMm) - 2}
                  width={mmToPx(box.wMm) + 4}
                  height={mmToPx(box.hMm) + 4}
                  rx={6}
                  fill="none"
                  stroke="var(--theme-accent)"
                  strokeWidth={1.4}
                  strokeDasharray="4 3"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
      </g>

      <g data-layer="wires">
        {project.wires.map((w) => (
          <WireView
            key={w.id}
            wire={w}
            fallbackStart={resolveEndpoint(w.a)}
            fallbackEnd={resolveEndpoint(w.b)}
            selected={selectedWireId === w.id}
            onPointerDown={(id, e) => {
              e.stopPropagation();
              if (draft) return;
              selectWire(id);
            }}
          />
        ))}
      </g>

      {draft && (
        <DraftWireView
          origin={draft.origin}
          bends={draft.bends}
          cursor={draft.cursor}
          color={spool.color}
          cs={spool.cs}
          valid={hoverTerm ? canCommitTo(hoverTerm) : true}
        />
      )}

      {ghost && (
        <g data-layer="ghost" pointerEvents="none">
          <rect
            x={mmToPx(ghost.xMm)}
            y={mmToPx(ghost.rect.deviceTopMm)}
            width={mmToPx(ghost.widthMm)}
            height={mmToPx(ghost.rect.deviceBotMm - ghost.rect.deviceTopMm)}
            rx={4}
            fill={ghost.valid ? 'var(--theme-accentSoft)' : 'var(--state-err-soft)'}
            stroke={ghost.valid ? 'var(--theme-accent)' : 'var(--state-err-color)'}
            strokeWidth={1.6}
            strokeDasharray="5 3"
          />
        </g>
      )}

      <DoorStrip devices={offPlateDevices} stripHeightMm={DOOR_STRIP_MM} />
    </MountingPlate>
    </ZoomContext.Provider>
  );
};
