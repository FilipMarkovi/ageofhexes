export function darken(hex: string, factor = 0.6) {
  const c = hex.slice(1);
  const num = parseInt(c, 16);

  let r = ((num >> 16) & 255) * factor;
  let g = ((num >> 8) & 255) * factor;
  let b = (num & 255) * factor;

  return `rgb(${r|0},${g|0},${b|0})`;
}

export function withAlpha(hex: string, alpha: number) {
  const c = hex.slice(1);
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
