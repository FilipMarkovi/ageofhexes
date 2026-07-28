
import type { CoreGameState } from "../../../shared/index.js";

let timerRoot: HTMLDivElement;
let timerTextEl: HTMLDivElement;

/**
 * Initializes the HQ Placement timer UI overlay element once.
 */
export function initPlacementTimerUI() {
  timerRoot = document.createElement("div");
  
  // Style container matching your clean dark theme aesthetic
  timerRoot.style.position = "absolute";
  timerRoot.style.top = "24px";
  timerRoot.style.left = "50%";
  timerRoot.style.transform = "translateX(-50%)";
  timerRoot.style.padding = "10px 20px";
  timerRoot.style.borderRadius = "10px";
  timerRoot.style.border = "1px solid rgba(37, 99, 235, 0.4)"; // Subtle blue border outline
  timerRoot.style.background = "rgba(15, 23, 42, 0.9)"; // Slate 900
  timerRoot.style.color = "white";
  timerRoot.style.zIndex = "45";
  timerRoot.style.display = "none"; // Hidden by default
  timerRoot.style.pointerEvents = "none"; // Clicks pass straight through to canvas map
  timerRoot.style.transition = "border-color 0.3s ease";

  timerRoot.innerHTML = `
    <div id="timer-text" style="font:700 16px system-ui; letter-spacing: 0.5px; text-align: center; white-space: nowrap;">
      DEPLOY YOUR HQ (left-click)! Battle begins in: --s
    </div>
  `;

  document.body.appendChild(timerRoot);
  timerTextEl = timerRoot.querySelector("#timer-text")!;
}

/**
 * Updates the placement phase container component during the main client loop execution.
 * Call this inside your main update/render loop.
 */
export function updatePlacementTimerUI(state: CoreGameState | null) {
  // 1. Only display if state data exists and we are actively inside the placement phase
  if (state && state.phase === "HQ_PLACEMENT" && !state.gameOver) {
    timerRoot.style.display = "block";

    const secondsLeft = state.placementTimeLeft ?? 15;
    timerTextEl.textContent = `DEPLOY YOUR HQ (left-click)! Battle begins in: ${secondsLeft}s`;

    // 2. Visual pressure warning: shift highlights to red when clock hits 3 seconds or less
    if (secondsLeft <= 3) {
      timerRoot.style.borderColor = "rgba(239, 68, 68, 0.8)"; // Red-500
      timerTextEl.style.color = "#ef4444";
    } else {
      timerRoot.style.borderColor = "rgba(37, 99, 235, 0.4)"; // Blue-600
      timerTextEl.style.color = "#ffffff";
    }
  } else {
    // 3. Fallback hide hook when transitioning to standard GAMEPLAY or GAME_OVER phases
    if (timerRoot) {
      timerRoot.style.display = "none";
    }
  }
}