// Shared color palette + intensity scaling for the contribution heatmap.
// Each entry: [key, hex]. Hex is the base (most-intense) shade.
// Legacy keys (terracotta/sage/lavender/butter) kept so existing goals keep their color.

export const PALETTE = [
  // Legacy four — map to brand tokens so old goals are unchanged.
  ['terracotta', '#C26A38'],
  ['sage',       '#6B8E5A'],
  ['lavender',   '#8E7CB8'],
  ['butter',     '#C89A3A'],
  // Expanded set (GitHub-style picker)
  ['rose',       '#D65A6B'],
  ['amber',      '#E0922B'],
  ['gold',       '#D4B23C'],
  ['lime',       '#7FA63F'],
  ['emerald',    '#2F9E6B'],
  ['teal',       '#2B9E8F'],
  ['cyan',       '#2BA8B8'],
  ['azure',      '#3B82C4'],
  ['indigo',     '#5A6BD6'],
  ['violet',     '#8B5AD6'],
  ['magenta',    '#C44D9E'],
  ['slate',      '#5B6470'],
];

const HEX = Object.fromEntries(PALETTE.map(([k, hex]) => [k, hex]));

export function paletteHex(key) {
  return HEX[key] || PALETTE[0][1];
}

// Parse #RRGGBB → {r,g,b}
function rgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * Heatmap cell color for a given intensity level (0..3) and a goal color key.
 * Level 0 = empty (neutral paper-ink wash). 1/2/3 ramp the base color's opacity.
 * Designed for the light paper theme: empty cells read as faint, full cells solid.
 */
export function cellColor(colorKey, level) {
  if (!level || level <= 0) return 'rgba(31,27,22,0.07)';
  const { r, g, b } = rgb(paletteHex(colorKey));
  const alpha = level === 1 ? 0.34 : level === 2 ? 0.64 : 1;
  return `rgba(${r},${g},${b},${alpha})`;
}

// Four legend swatches for a color (empty + 3 levels).
export function legendColors(colorKey) {
  return [0, 1, 2, 3].map(l => cellColor(colorKey, l));
}
