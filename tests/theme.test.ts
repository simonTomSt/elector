import { describe, it, expect } from 'vitest';
import { applyTheme, buildCssVars } from '@/ui/theme/tokens';

describe('tokens → CSS variables', () => {
  it('generuje zmienne dla motywu ciemnego', () => {
    const vars = buildCssVars('dark');
    expect(vars['--theme-bg']).toBe('#0E1217');
    expect(vars['--theme-text']).toBe('#E7ECF1');
    expect(vars['--size-topBar']).toBe('64');
    expect(vars['--state-off-label']).toBe('Brak napięcia');
    expect(vars['--wire-brown-color']).toBe('#8A5A2E');
  });

  it('generuje zmienne dla motywu jasnego', () => {
    const vars = buildCssVars('light');
    expect(vars['--theme-bg']).toBe('#EEF1F4');
    expect(vars['--theme-text']).toBe('#121820');
  });

  it('applyTheme ustawia data-theme oraz zmienne na elemencie', () => {
    const root = document.createElement('div');
    applyTheme('light', root);
    expect(root.dataset['theme']).toBe('light');
    expect(root.style.getPropertyValue('--theme-bg')).toBe('#EEF1F4');

    applyTheme('dark', root);
    expect(root.dataset['theme']).toBe('dark');
    expect(root.style.getPropertyValue('--theme-bg')).toBe('#0E1217');
  });
});
