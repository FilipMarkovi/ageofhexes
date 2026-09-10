const BASE_WIDTH = 1400;
const BASE_HEIGHT = 800;
const MIN_UI_SCALE = 0.5;

let uiScale = 1;
const uiRoots = new Set<HTMLElement>();

function calculateUiScale(): number {
  return Math.max(MIN_UI_SCALE, Math.min(window.innerWidth / BASE_WIDTH, window.innerHeight / BASE_HEIGHT));
}

function applyUiScale(root: HTMLElement): void {
  root.style.setProperty("zoom", `${uiScale}`);
}

export function getUiScale(): number {
  return uiScale;
}

export function getUiLayoutWidth(): number {
  return BASE_WIDTH;
}

export function getUiOffset(canvas: HTMLCanvasElement): { x: number; y: number } {
  return {
    x: (canvas.width - BASE_WIDTH * uiScale) / 2,
    y: (canvas.height - BASE_HEIGHT * uiScale) / 2,
  };
}

export function updateUiScale(): number {
  uiScale = calculateUiScale();
  uiRoots.forEach(applyUiScale);
  return uiScale;
}

export function registerUiRoot(root: HTMLElement): void {
  uiRoots.add(root);
  applyUiScale(root);
}

updateUiScale();