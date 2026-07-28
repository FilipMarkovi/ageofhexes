import { camera } from "../render/camera.js";

let dragging = false;
let lastX = 0;
let lastY = 0;

export function initPan(canvas: HTMLCanvasElement) {
  canvas.addEventListener("mousedown", (e) => {
    // LEFT mouse drag pans
    if (e.button !== 0) return;

    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;

    const dx = (e.clientX - lastX) / camera.zoom;
    const dy = (e.clientY - lastY) / camera.zoom;

    // move camera opposite to mouse drag
    camera.x -= dx;
    camera.y -= dy;

    lastX = e.clientX;
    lastY = e.clientY;
  });

  // avoid browser drag/selection artifacts
  canvas.addEventListener("dragstart", (e) => e.preventDefault());
}
