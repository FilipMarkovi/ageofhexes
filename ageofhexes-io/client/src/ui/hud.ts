
import { clientNetState } from "../state/clientState.js";
import { clientUIState } from "../state/clientState.js";
import { BASE_GOLD_MAX, BASE_ARMY_MAX, ARMY_CAP_PER_TILE, TICK_RATE, HOUSE_ARMY_CAP_BONUS} from "../../../shared/constants.js";
import { myConTileCount } from "../main.js";

let lastArmy = 0;
let lastGold = 0;
let displayedArmyGain = "0";
let displayedGoldGain = "0";
const ticking = 1000 / TICK_RATE
let surrenderBtnEl: HTMLButtonElement | null = null;

export function initHudUI(sendIntent: (intent: any) => void) {
  if (surrenderBtnEl) return;

  surrenderBtnEl = document.createElement("button");
  surrenderBtnEl.textContent = "Surrender";
  surrenderBtnEl.style.position = "absolute";
  surrenderBtnEl.style.right = "18px";
  surrenderBtnEl.style.bottom = "18px";
  surrenderBtnEl.style.zIndex = "70";
  surrenderBtnEl.style.padding = "10px 14px";
  surrenderBtnEl.style.borderRadius = "10px";
  surrenderBtnEl.style.border = "1px solid rgba(239, 68, 68, 0.45)";
  surrenderBtnEl.style.background = "rgba(127, 29, 29, 0.75)";
  surrenderBtnEl.style.color = "#fecaca";
  surrenderBtnEl.style.font = "700 13px system-ui";
  surrenderBtnEl.style.cursor = "pointer";
  surrenderBtnEl.style.boxShadow = "0 6px 18px rgba(0,0,0,0.35)";
  surrenderBtnEl.style.backdropFilter = "blur(6px)";
  surrenderBtnEl.style.display = "none";

  surrenderBtnEl.onclick = () => {
    sendIntent({ type: "SUICIDE" });
    surrenderBtnEl!.disabled = true;
    surrenderBtnEl!.style.opacity = "0.7";
  };

  document.body.appendChild(surrenderBtnEl);
}

// Helper for rounded rectangles (better aesthetics)
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStatBar(
  ctx: CanvasRenderingContext2D, 
  x: number, y: number, 
  val: number, 
  max: number, 
  label: string, 
  color: string,
  gain: string
) {
  const width = 180;
  const height = 18;
  const centerY = y + height / 2;
  
  // 1. Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  roundRect(ctx, x, y, width, height, 4);
  ctx.fill();

  // 2. Progress fill
  const fillWidth = Math.min(width, (val / max) * width);
  ctx.fillStyle = color;
  if (fillWidth > 0) {
    roundRect(ctx, x, y, fillWidth, height, 4);
    ctx.fill();
  }

  // 3. Text (Perfectly Centered Vertically)
  ctx.textBaseline = "middle";
  ctx.font = "bold 11px sans-serif";
  
  // Left Label
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.textAlign = "left";
  ctx.fillText(label, x + 8, centerY);
  
  // Right Numbers: Current / Max (+Gain)
  ctx.textAlign = "right";
  // The gain is shown in brackets next to the total
  const statText = `${Math.floor(val)} / ${max} (+${gain}/s)`;
  ctx.fillText(statText, x + width - 8, centerY);
}

export function drawHUD(ctx: CanvasRenderingContext2D) {
  const state = clientNetState.state;
  const me = clientNetState.playerId ? state?.players.get(clientNetState.playerId) : null;

  if (surrenderBtnEl) {
    const canSurrender = !!state && !!me && clientUIState.phase === "PLAYING" && !state.gameOver && !me.eliminated;
    surrenderBtnEl.style.display = canSurrender ? "block" : "none";
    surrenderBtnEl.disabled = false;
    surrenderBtnEl.style.opacity = "1";
  }

  if (!state || !me) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(10, 10, 150, 30);
    ctx.fillStyle = "#fff";
    ctx.font = "14px sans-serif";
    ctx.fillText(`Connecting...`, 20, 30);
    return;
  }

  // 1. Panel Background
  ctx.fillStyle = "rgba(20, 20, 25, 0.8)";
  roundRect(ctx, 8, 8, 200, 90, 8);
  ctx.fill();
  ctx.strokeStyle = me.color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 2. Player Name
  ctx.fillStyle = me.color;
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "left";
  if(me.username)
    ctx.fillText(me.username, 15, 28);
  else
    ctx.fillText("unknown", 15, 28);

  const effectiveOwned = Math.max(0, (myConTileCount ?? 0) - 1);
  const currentArmyMax = BASE_ARMY_MAX + (effectiveOwned * ARMY_CAP_PER_TILE) + (me.buildings.house ?? 0) * HOUSE_ARMY_CAP_BONUS;
  const ratio = me.army / currentArmyMax;

  if (me.army > lastArmy) {
      displayedArmyGain = ((me.army - lastArmy) * ticking).toFixed(1); 
  }

  if (me.gold > lastGold) {
      displayedGoldGain = ((me.gold - lastGold) * ticking).toFixed(1);
  }
  if (me.army == currentArmyMax)
    displayedArmyGain = "0";
  if(me.gold == BASE_GOLD_MAX)
    displayedGoldGain = "0";

  lastArmy = me.army;
  lastGold = me.gold;

  // 3. Army bar
  drawStatBar(ctx, 18, 40, me.army, currentArmyMax, "ARMY", "#ef4444", displayedArmyGain);

  // 4. Gold Bar
  drawStatBar(ctx, 18, 65, me.gold, BASE_GOLD_MAX, "GOLD", "#eab308", displayedGoldGain);
}

export function drawTargetingHUD(ctx: CanvasRenderingContext2D) {
  const building = clientUIState.selectedBuilding;
  const ability = clientUIState.selectedAbility;

  if (!building && !ability) return;

  ctx.save();

  const pulse = 0.6 + Math.sin(Date.now() * 0.004) * 0.4;

  const titleText = building ? `🔨 CONSTRUCTING ${building}` : `🧪 CASTING ${ability!.replace("_", " ")}`;
  const titleColor = building ? "#60a5fa" : "#c084fc"; // Blue for structural, Purple for tech
  const accentColor = building ? "rgba(59, 130, 246, 1)" : `rgba(168, 85, 247, ${pulse})`;

  // Calculate layout dynamics dynamically based on text width
  ctx.font = "bold 13px sans-serif";
  const boxWidth = Math.max(320, ctx.measureText(titleText).width + 48);
  const boxHeight = 46;
  const x = (ctx.canvas.width - boxWidth) / 2;
  const y = 16;

  // 1. Draw the sleek translucent core container card
  ctx.fillStyle = "rgba(15, 23, 42, 0.93)"; // Deep premium slate
  ctx.fillRect(x, y, boxWidth, boxHeight);

  // 2. Draw surrounding safety boundary glow
  ctx.strokeStyle = building ? "rgba(255, 255, 255, 0.12)" : `rgba(168, 85, 247, ${pulse * 0.4})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, boxWidth, boxHeight);

  // 3. Draw the top branding accent line strip
  ctx.fillStyle = accentColor;
  ctx.fillRect(x, y, boxWidth, 3);

  // 4. Render typography instructions centrally
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Mode Header Text
  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = titleColor;
  ctx.fillText(titleText, ctx.canvas.width / 2, y + 16);

  // Action Cancel Subtext Guide
  ctx.font = "500 10px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.fillText("Click target hex to deploy • [ESC] Cancel", ctx.canvas.width / 2, y + 32);

  ctx.restore();
}

interface GameLogMessage {
  id: number;
  text: string;
  color: string;
  timestamp: number;
  opacity: number;
  xOffset: number; // For "slide-in" animation
}

export const gameLogs: GameLogMessage[] = [];
const MAX_LOGS = 5;
const LOG_LIFETIME = 10000;

export function addGameLog(text: string, color: string = "#ffffff") {
  gameLogs.unshift({
    id: Date.now(),
    text,
    color,
    timestamp: Date.now(),
    opacity: 0, // Start transparent
    xOffset: -20 // Start slightly to the left
  });

  if (gameLogs.length > MAX_LOGS) {
    gameLogs.pop();
  }
}

export function drawGameLogs(ctx: CanvasRenderingContext2D) {
  const now = Date.now();
  const startY = 120;
  const spacing = 28; // Increased spacing for a cleaner look

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  for (let i = 0; i < gameLogs.length; i++) {
    const log = gameLogs[i];
    const age = now - log.timestamp;

    // 1. Smooth Animation Logic (Lerp)
    // Slide in and Fade in
    log.opacity += (1 - log.opacity) * 0.15;
    log.xOffset += (0 - log.xOffset) * 0.15;

    // Fade out at the end
    let displayOpacity = log.opacity;
    if (age > LOG_LIFETIME - 1000) {
      displayOpacity = Math.max(0, (LOG_LIFETIME - age) / 1000);
    }

    if (displayOpacity <= 0) continue;

    const x = 12 + log.xOffset;
    const y = startY + i * spacing;

    ctx.save();
    ctx.globalAlpha = displayOpacity;

    // 2. Draw Background Pill with Gradient
    const textWidth = ctx.measureText(log.text).width;
    const bgWidth = textWidth + 24;
    const bgHeight = 22;

    // Subtle dark gradient
    const grad = ctx.createLinearGradient(x, 0, x + bgWidth, 0);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.7)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0.2)");
    
    ctx.fillStyle = grad;
    roundRect(ctx, x, y - bgHeight / 2, bgWidth, bgHeight, 4);
    ctx.fill();

    // 3. Draw Left Accent Border (The "Pro" touch)
    ctx.fillStyle = log.color;
    // A thin 3px vertical line on the left of the pill
    ctx.fillRect(x, y - bgHeight / 2, 3, bgHeight);

    // 4. Draw Text with slight shadow for pop
    ctx.font = "bold 13px Inter, sans-serif";
    
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillText(log.text, x + 13, y + 1); 
    
    // Main Text
    ctx.fillStyle = "#ffffff"; // Keep text white for readability
    // Or use log.color if you want the text itself to be colored
    ctx.fillText(log.text, x + 12, y);

    ctx.restore();
  }
}