import { useEffect } from 'react';
import { useUiStore, type MainView } from '@/store/ui';

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
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
      if (isTypingContext(e.target)) return;
      // Nie łap klawiszy gdy otwarty jest modal
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const target = VIEW_BY_KEY[e.key];
      if (!target) return;
      e.preventDefault();
      setView(target);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setView]);
};
