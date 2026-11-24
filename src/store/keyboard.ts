import { useEffect } from 'react';
import { useUiStore, type MainView } from '@/store/ui';
import { useProjectStore } from '@/store/project';

const VIEW_BY_KEY: Record<string, MainView> = {
  '1': 'tasks',
  '2': 'cabinet',
  '3': 'schematic',
  '4': 'mixed',
  '5': 'editor',
};

const isTypingContext = (target: EventTarget | null): boolean => {
  if (!target) return false;
  const el = target as HTMLElement;
  const tag = el.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  return false;
};

/**
 * Globalne skróty klawiaturowe. Montowane raz w App.
 * Skróty cyfrowe 1-5 przełączają widoki, ignorowane gdy fokus jest w inpucie
 * albo gdy otwarty jest modal (dialog w DOM).
 */
export const useGlobalShortcuts = (): void => {
  const setView = useUiStore((s) => s.setView);
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (isTypingContext(e.target)) return;
      // Nie łap klawiszy gdy otwarty jest modal
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      // Undo / Redo: Ctrl+Z / Ctrl+Shift+Z (lub Meta na macOS)
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        const p = useProjectStore.getState();
        if (e.shiftKey) {
          if (p.canRedo()) p.redo();
        } else {
          if (p.canUndo()) p.undo();
        }
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        const p = useProjectStore.getState();
        if (p.canRedo()) p.redo();
        return;
      }

      // Nawigacja cyfrowa — bez modyfikatorów
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
      const target = VIEW_BY_KEY[e.key];
      if (!target) return;
      e.preventDefault();
      setView(target);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setView]);
};
