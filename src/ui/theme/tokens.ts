import tokensJson from '../../../design/tokens.json';

export const tokens = tokensJson;
export type Tokens = typeof tokensJson;
export type ThemeName = 'dark' | 'light';

const flatten = (prefix: string, value: unknown, out: Record<string, string>): void => {
  if (value === null || value === undefined) return;
  if (typeof value === 'string' || typeof value === 'number') {
    out[prefix] = String(value);
    return;
  }
  if (typeof value === 'object') {
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (key.startsWith('$')) continue;
      const next = prefix ? `${prefix}-${key}` : key;
      flatten(next, v, out);
    }
  }
};

export const buildCssVars = (theme: ThemeName): Record<string, string> => {
  const t = tokens;
  const out: Record<string, string> = {};

  flatten('font', t.font, out);
  flatten('radius', t.radius, out);
  flatten('space', t.space, out);
  flatten('size', t.size, out);
  flatten('state', t.state, out);
  flatten('wire', t.wire, out);
  flatten('ferrule', t.ferrule, out);
  flatten('schematic', t.schematic, out);
  flatten('motion', t.motion, out);

  flatten('theme', t.theme[theme], out);
  flatten('scene', t.scene[theme], out);
  flatten('schematic-theme', t.schematic[theme], out);

  const prefixed: Record<string, string> = {};
  for (const [k, v] of Object.entries(out)) {
    prefixed[`--${k}`] = v;
  }
  return prefixed;
};

export const applyTheme = (theme: ThemeName, root: HTMLElement = document.documentElement): void => {
  const vars = buildCssVars(theme);
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
  root.dataset['theme'] = theme;
};
