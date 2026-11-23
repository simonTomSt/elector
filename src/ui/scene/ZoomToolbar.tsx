import type { FC } from 'react';
import { useProjectStore } from '@/store/project';
import './ZoomToolbar.css';

export const ZoomToolbar: FC = () => {
  const zoom = useProjectStore((s) => s.view.zoom);
  const setZoom = useProjectStore((s) => s.setZoom);
  const resetView = useProjectStore((s) => s.resetView);

  return (
    <div className="zoombar" role="group" aria-label="Zoom i widok">
      <button
        type="button"
        aria-label="Oddal"
        onClick={() => setZoom(zoom / 1.2)}
      >
        −
      </button>
      <span className="zoombar__val mono" aria-live="polite">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        aria-label="Przybliż"
        onClick={() => setZoom(zoom * 1.2)}
      >
        +
      </button>
      <span className="zoombar__sep" aria-hidden="true" />
      <button
        type="button"
        aria-label="Dopasuj do okna"
        onClick={resetView}
      >
        ⤢
      </button>
    </div>
  );
};
