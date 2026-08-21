import { clientNetState } from "../state/clientState.js";

const UPDATE_INTERVAL_MS = 500;

let visible = false;
let el: HTMLDivElement | null = null;
let updateIntervalId: ReturnType<typeof setInterval> | null = null;

function ensureElement(): HTMLDivElement {
  if (el) return el;

  el = document.createElement("div");
  el.style.position = "absolute";
  el.style.top = "8px";
  el.style.right = "12px";
  el.style.zIndex = "90";
  el.style.padding = "4px 10px";
  el.style.borderRadius = "8px";
  el.style.background = "rgba(15, 23, 42, 0.75)";
  el.style.color = "#e2e8f0";
  el.style.font = "600 12px system-ui";
  el.style.pointerEvents = "none";
  el.style.display = "none";
  document.body.appendChild(el);
  return el;
}

function updateText() {
  if (!el) return;
  const ms = clientNetState.latencyMs;
  el.textContent = `Latency: ${ms !== null ? Math.round(ms) : "--"}ms`;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export function initLatencyDisplay() {
  ensureElement();

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.key.toLowerCase() !== "p") return;
    if (isTypingTarget(e.target)) return;

    visible = !visible;
    if (!el) return;
    el.style.display = visible ? "block" : "none";

    if (visible) {
      updateText();
      if (updateIntervalId === null) {
        updateIntervalId = setInterval(updateText, UPDATE_INTERVAL_MS);
      }
    } else if (updateIntervalId !== null) {
      clearInterval(updateIntervalId);
      updateIntervalId = null;
    }
  });
}
