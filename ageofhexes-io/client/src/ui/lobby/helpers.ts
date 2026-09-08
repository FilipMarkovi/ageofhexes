import { PRIVATE_MAP_OPTIONS } from "./constants.js";
import { EQUIPPED_SKIN_STORAGE_KEY, USERNAME_STORAGE_KEY } from "../../../../shared/index.js";
import { DEFAULT_SKIN_ID } from "../../../../shared/storeItems.js";

export function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function getPrivateMapLabel(mapId: string): string {
  return PRIVATE_MAP_OPTIONS.find((opt) => opt.id === mapId)?.label ?? mapId;
}

export function setGuestName(newName: string): void {
  localStorage.setItem(USERNAME_STORAGE_KEY, newName.trim());
}

export function clearGuestName(): void {
  localStorage.removeItem(USERNAME_STORAGE_KEY);
}

export function getOrCreateGuestName(): string {
  // Check if a username is already saved in localStorage
  const savedName = localStorage.getItem(USERNAME_STORAGE_KEY);
  if (savedName) {
    return savedName;
  }

  // generate a new random username if none exists
  const randomId = Math.floor(1000000 + Math.random() * 9000000);
  const newName = `Player_${randomId}`;

  setGuestName(newName);

  return newName;
}

export function getEquippedSkin(): string {
  return localStorage.getItem(EQUIPPED_SKIN_STORAGE_KEY) ?? DEFAULT_SKIN_ID;
}

export function setEquippedSkin(skinId: string): void {
  localStorage.setItem(EQUIPPED_SKIN_STORAGE_KEY, skinId);
}

let skinPreviewEl: HTMLImageElement | null = null;

function getSkinPreviewEl(): HTMLImageElement {
  if (!skinPreviewEl) {
    skinPreviewEl = document.createElement("img");
    skinPreviewEl.style.cssText =
      "position:fixed; z-index:200; pointer-events:none; width:220px; height:220px; object-fit:cover; border-radius:12px; border:2px solid rgba(56,189,248,0.5); box-shadow:0 20px 40px rgba(0,0,0,0.5); display:none;";
    document.body.appendChild(skinPreviewEl);
  }
  return skinPreviewEl;
}

// Shows an enlarged version of a skin's preview image while the mouse hovers over an element.
export function attachSkinPreviewHover(el: HTMLElement, previewSrc: string): void {
  const preview = () => getSkinPreviewEl();

  const positionPreview = (event: MouseEvent) => {
    const img = preview();
    const margin = 16;
    const rect = el.getBoundingClientRect();
    let left = rect.right + margin;
    let top = rect.top;
    if (left + 220 > window.innerWidth) left = rect.left - margin - 220;
    if (top + 220 > window.innerHeight) top = window.innerHeight - margin - 220;
    img.style.left = `${Math.max(margin, left)}px`;
    img.style.top = `${Math.max(margin, top)}px`;
  };

  el.addEventListener("mouseenter", (event) => {
    const img = preview();
    img.src = previewSrc;
    img.style.display = "block";
    positionPreview(event as MouseEvent);
  });
  el.addEventListener("mousemove", (event) => positionPreview(event as MouseEvent));
  el.addEventListener("mouseleave", () => {
    preview().style.display = "none";
  });
}


let stylesInjected = false;

function injectStepperStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    .hex-number-input::-webkit-outer-spin-button,
    .hex-number-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .hex-number-input {
      -moz-appearance: textfield;
    }
    .hex-stepper-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      width: 16px;
      border: none;
      background: rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      font-size: 7px;
      transition: background 0.15s, color 0.15s;
    }
    .hex-stepper-btn + .hex-stepper-btn {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .hex-stepper-btn:hover {
      background: #2563eb;
      color: white;
    }
    .hex-stepper-btn:active {
      background: #1d4ed8;
    }
  `;
  document.head.appendChild(style);
}

/** Replaces a number input's native spinner with steppers styled to match the lobby UI. */
export function attachNumberStepper(input: HTMLInputElement, opts: { min?: number; max?: number } = {}): void {
  injectStepperStyles();
  input.classList.add("hex-number-input");
  input.style.paddingRight = "18px";
  input.style.boxSizing = "border-box";

  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.display = "inline-flex";

  input.parentElement?.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const stepperContainer = document.createElement("div");
  stepperContainer.style.position = "absolute";
  stepperContainer.style.right = "1px";
  stepperContainer.style.top = "1px";
  stepperContainer.style.bottom = "1px";
  stepperContainer.style.display = "flex";
  stepperContainer.style.flexDirection = "column";
  stepperContainer.style.borderRadius = "0 5px 5px 0";
  stepperContainer.style.overflow = "hidden";

  const upBtn = document.createElement("button");
  upBtn.type = "button";
  upBtn.className = "hex-stepper-btn";
  upBtn.textContent = "▲";
  upBtn.tabIndex = -1;

  const downBtn = document.createElement("button");
  downBtn.type = "button";
  downBtn.className = "hex-stepper-btn";
  downBtn.textContent = "▼";
  downBtn.tabIndex = -1;

  const clamp = (val: number) => {
    const min = opts.min ?? (input.min !== "" ? parseFloat(input.min) : -Infinity);
    const max = opts.max ?? (input.max !== "" ? parseFloat(input.max) : Infinity);
    return Math.min(max, Math.max(min, val));
  };

  const changeValue = (delta: number) => {
    const step = parseFloat(input.step) || 1;
    const current = parseFloat(input.value) || 0;
    input.value = `${clamp(current + delta * step)}`;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  upBtn.addEventListener("click", () => changeValue(1));
  downBtn.addEventListener("click", () => changeValue(-1));

  stepperContainer.appendChild(upBtn);
  stepperContainer.appendChild(downBtn);
  wrapper.appendChild(stepperContainer);
}
