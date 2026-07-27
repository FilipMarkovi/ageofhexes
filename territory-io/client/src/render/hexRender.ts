import type { TileState, PlayerId, BuildingType } from "../../../shared/index.js";
import { canCaptureClient } from "../utils/canCapture.js";
import { camera } from "./camera.js";
import { getStripePattern } from "./patterns.js";
import { FILL_ALPHA } from "../../../shared/constants.js";
import { darken } from "./playerColors.js";
import { DEFENSE_HEAT_DECAY_MS, BUILDING_CONSTRUCTION_TIME, BUILDING_DEMOLISH_TIME } from "../../../shared/constants.js";
import { tileTextures } from "./assetManager.js";
import { getServerNow } from "../utils/time.js";

/**
 * BATCH PASS 1: Renders background textures, team color overlays, and 
 * combines all grid line boundaries into a single hardware stroke pass.
 */
export function drawHexBatch(
  ctx: CanvasRenderingContext2D,
  items: Array<{
    tile: TileState;
    x: number;
    y: number;
    worldX: number;
    worldY: number;
    color: string;
    fillAlpha: number;
    isHovered: boolean;
  }>,
  size: number
) {
  const renderSize = size * camera.zoom;

  // 1. Draw Terrain Backgrounds and Ownership Fills
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { x, y, worldX, worldY, tile, color, fillAlpha, isHovered } = item;
    const owner = tile.ownerId;

    ctx.beginPath();
    for (let j = 0; j < 6; j++) {
      const angle = (Math.PI / 3) * j + Math.PI / 6;
      ctx.lineTo(
        x + renderSize * Math.cos(angle),
        y + renderSize * Math.sin(angle)
      );
    }
    ctx.closePath();

    if (!owner && !isHovered) {
      let activePattern: CanvasPattern | null = null;
      const tileTerrain = tile.terrain;
      if (tileTerrain === "GRASS") activePattern = tileTextures.grass;
      if (tileTerrain === "DESERT") activePattern = tileTextures.desert;
      if (tileTerrain === "MOUNTAIN") activePattern = tileTextures.mountain;
      if (tileTerrain === "WATER") activePattern = tileTextures.water;

      if (activePattern) {
        ctx.save();
        ctx.translate(-camera.x * camera.zoom + ctx.canvas.width / 2, -camera.y * camera.zoom + ctx.canvas.height / 2);
        
        const patternDetailScale = 0.5; 
        ctx.scale(camera.zoom * patternDetailScale, camera.zoom * patternDetailScale);
        
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const angle = (Math.PI / 3) * j + Math.PI / 6;
          ctx.lineTo(
            (worldX + size * Math.cos(angle)) / patternDetailScale, 
            (worldY + size * Math.sin(angle)) / patternDetailScale
          );
        }
        ctx.closePath();

        ctx.fillStyle = activePattern;
        ctx.fill();
        ctx.restore(); 
      } else {
        if (tileTerrain === "DESERT") ctx.fillStyle = "#af8246";
        else if (tileTerrain === "MOUNTAIN") ctx.fillStyle = "#424242";
        else if (tileTerrain === "WATER") ctx.fillStyle = "#1561b9";
        else ctx.fillStyle = "#58853e";
        ctx.fill();
      }
    }

    // Layer 2: TEAM COLOR / HOVER HIGHLIGHT OVERLAY
    ctx.save();
    ctx.globalAlpha = fillAlpha;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  // 2. High Performance Unified Grid Lines Pass
  ctx.lineWidth = Math.min(2, 2 / camera.zoom);
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { x, y } = item;
    for (let j = 0; j < 6; j++) {
      const angle = (Math.PI / 3) * j + Math.PI / 6;
      const px = x + renderSize * Math.cos(angle);
      const py = y + renderSize * Math.sin(angle);
      if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  ctx.stroke();
}

/**
 * BATCH PASS 2: Renders dynamic grid shield flashes and local defense heat tracking layers.
 */
export function drawHexEffectsBatch(
  ctx: CanvasRenderingContext2D,
  items: any[],
  size: number
) {
  const now = getServerNow();
  const renderSize = size * camera.zoom;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { x, y, tile } = item;
    const timeSinceLast = now - (tile.lastDefendedAt || 0);
    if (timeSinceLast > DEFENSE_HEAT_DECAY_MS) continue;

    // EFFECT 1: ATTACK COOLDOWN (The 1-second "Stun")
    if (timeSinceLast < 1000) {
      const p = 1 - (timeSinceLast / 1000);
      ctx.save();
      ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        const angle = (Math.PI / 3) * j + Math.PI / 6;
        const px = x + renderSize * Math.cos(angle);
        const py = y + renderSize * Math.sin(angle);
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      
      ctx.strokeStyle = `rgba(255, 255, 255, ${p * 0.8})`;
      ctx.lineWidth = 4 * camera.zoom;
      ctx.stroke();
      
      ctx.fillStyle = `rgba(255, 255, 255, ${p * 0.2})`;
      ctx.fill();
      ctx.restore();
    }

    // EFFECT 2: DEFENSE HEAT (The 10-second "Heat")
    if (timeSinceLast < DEFENSE_HEAT_DECAY_MS && tile.defenseHeat > 0) {
      const p = 1 - (timeSinceLast / DEFENSE_HEAT_DECAY_MS);
      const radius = renderSize * 0.75;
      
      ctx.save();
      const heatColor = tile.defenseHeat >= 3 ? "#ec2d2d" : "#ec9150d7";
      
      ctx.setLineDash([4 * camera.zoom, 4 * camera.zoom]);
      ctx.strokeStyle = heatColor;
      ctx.globalAlpha = p * 0.6;
      ctx.lineWidth = (1 + tile.defenseHeat) * camera.zoom;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

/**
 * BATCH PASS 3: Static building geometries.
 * Sets the drawing styles once to remove redundant pipeline state switches.
 */
export function drawBuildingsBatch(
  ctx: CanvasRenderingContext2D,
  items: any[],
  size: number
) {
  const s = size * camera.zoom * 0.35;

  // 1. Draw structural ground shadows together
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { x, y, tile } = item;
    if (!tile.building && !tile.buildingAction) continue;

    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.6, s * 1.2, s * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Lock uniform layout styles once for all building vector loops
  ctx.save();
  ctx.lineWidth = Math.max(1.5, 2 * camera.zoom);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#ffffffb2"; 
  ctx.fillStyle = "rgba(20, 24, 28, 0.9)"; 

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { x, y, tile } = item;

    let type: BuildingType | "HQ" | null = null;
    if (tile.buildingAction) {
      type = tile.buildingAction.building;
    } else if (tile.building) {
      type = tile.building;
    }
    if (!type) continue;

    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();

    switch (type) {
      case "HOUSE":
        ctx.moveTo(-s * 0.8, s * 0.8); ctx.lineTo(s * 0.8, s * 0.8);
        ctx.lineTo(s * 0.8, -s * 0.2); ctx.lineTo(0, -s * 0.8); 
        ctx.lineTo(-s * 0.8, -s * 0.2); ctx.closePath();
        ctx.moveTo(-s * 0.25, s * 0.8); ctx.lineTo(-s * 0.25, s * 0.2);
        ctx.lineTo(s * 0.25, s * 0.2); ctx.lineTo(s * 0.25, s * 0.8);
        break;

      case "BARRACKS":
        ctx.moveTo(-s * 0.7, -s * 0.7); ctx.lineTo(s * 0.7, s * 0.7);
        ctx.moveTo(-s * 0.7, -s * 0.7); ctx.lineTo(-s * 0.3, -s * 0.7);
        ctx.lineTo(-s * 0.7, -s * 0.3);
        ctx.moveTo(s * 0.4, s * 0.4); ctx.lineTo(s * 0.6, s * 0.2);
        ctx.moveTo(s * 0.7, -s * 0.7); ctx.lineTo(-s * 0.7, s * 0.7);
        ctx.moveTo(s * 0.7, -s * 0.7); ctx.lineTo(s * 0.3, -s * 0.7);
        ctx.lineTo(s * 0.7, -s * 0.3);
        ctx.moveTo(-s * 0.4, s * 0.4); ctx.lineTo(-s * 0.6, s * 0.2);
        break;

      case "FORT":
        ctx.moveTo(-s * 0.9, s * 0.9); ctx.lineTo(s * 0.9, s * 0.9);
        ctx.lineTo(s * 0.9, -s * 0.5);
        ctx.lineTo(s * 0.5, -s * 0.5); ctx.lineTo(s * 0.5, -s * 0.2);
        ctx.lineTo(s * 0.2, -s * 0.2); ctx.lineTo(s * 0.2, -s * 0.5);
        ctx.lineTo(-s * 0.2, -s * 0.5); ctx.lineTo(-s * 0.2, -s * 0.2);
        ctx.lineTo(-s * 0.5, -s * 0.2); ctx.lineTo(-s * 0.5, -s * 0.5);
        ctx.lineTo(-s * 0.9, -s * 0.5); ctx.closePath();
        ctx.moveTo(-s * 0.3, s * 0.9); ctx.lineTo(-s * 0.3, s * 0.4);
        ctx.arc(0, s * 0.4, s * 0.3, Math.PI, 0); 
        ctx.lineTo(s * 0.3, s * 0.9);
        break;
      
      case "LABORATORY":
        ctx.moveTo(-s * 0.9, s * 0.8);  
        ctx.lineTo(s * 0.9, s * 0.8);   
        ctx.lineTo(s * 0.25, -s * 0.1);
        ctx.lineTo(s * 0.25, -s * 0.7); 
        ctx.lineTo(s * 0.4, -s * 0.7);  
        ctx.lineTo(s * 0.4, -s * 0.85);
        ctx.lineTo(-s * 0.4, -s * 0.85);
        ctx.lineTo(-s * 0.4, -s * 0.7); 
        ctx.lineTo(-s * 0.25, -s * 0.7);
        ctx.lineTo(-s * 0.25, -s * 0.1);
        ctx.closePath();
        break;

      case "SIEGE_OUTPOST":
        ctx.beginPath();
        ctx.moveTo(0, s * 0.45); 
        ctx.quadraticCurveTo(-s * 0.5, s * 0.45, -s * 0.85, s * 0.85);
        ctx.lineTo(-s * 0.65, s * 0.85);
        ctx.quadraticCurveTo(-s * 0.3, s * 0.5, 0, s * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-s * 0.65, s * 0.3);   
        ctx.lineTo(-s * 0.48, s * 0.0);   
        ctx.lineTo(s * 0.75, -s * 0.5);   
        ctx.lineTo(s * 0.7, -s * 0.58);
        ctx.lineTo(s * 0.83, -s * 0.64);
        ctx.lineTo(s * 0.96, -s * 0.38);
        ctx.lineTo(s * 0.83, -s * 0.32);
        ctx.lineTo(s * 0.58, -s * 0.2);   
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(-s * 0.6, s * 0.17, s * 0.09, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, s * 0.45, s * 0.45, 0, Math.PI * 2); 
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, s * 0.45, s * 0.11, 0, Math.PI * 2); 
        ctx.stroke();

        ctx.moveTo(-s * 0.45, s * 0.45); ctx.lineTo(s * 0.45, s * 0.45); 
        ctx.moveTo(0, s * 0.0);          ctx.lineTo(0, s * 0.9);          
        ctx.stroke();

        ctx.beginPath();
        break;
        
      case "HQ":
        ctx.moveTo(-s * 0.7, s * 0.8); ctx.lineTo(s * 0.7, s * 0.8); 
        ctx.lineTo(s * 0.9, -s * 0.5); 
        ctx.lineTo(s * 0.4, -s * 0.1); 
        ctx.lineTo(0, -s * 0.9);       
        ctx.lineTo(-s * 0.4, -s * 0.1); 
        ctx.lineTo(-s * 0.9, -s * 0.5); 
        ctx.closePath();
        ctx.moveTo(0, s * 0.5); ctx.arc(0, s * 0.5, s * 0.1, 0, Math.PI * 2);
        ctx.moveTo(-s * 0.4, s * 0.5); ctx.arc(-s * 0.4, s * 0.5, s * 0.08, 0, Math.PI * 2);
        ctx.moveTo(s * 0.4, s * 0.5); ctx.arc(s * 0.4, s * 0.5, s * 0.08, 0, Math.PI * 2);
        break;
    }

    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/**
 * BATCH PASS 4: Linear capture progress tracking rings.
 */
const visualProgressMap = new Map<string, number>();
export function drawCaptureHexBatch(
  ctx: CanvasRenderingContext2D,
  items: any[],
  size: number,
  deltaTime: number
) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { tile, x, y, captureColor } = item;
    if (!tile.capture) continue;

    // Use remaining -> convert to progress fraction for visuals
    const serverProgress = tile.capture ? (1 - (tile.capture.remaining ?? 1)) : 0;
    const tileKey = `${tile.q},${tile.r}`;
    
    let visualProgress = visualProgressMap.get(tileKey) ?? 0;
    if (serverProgress === 0 || visualProgress > serverProgress) visualProgress = 0;

    const lerpSpeed = 10 * deltaTime; 
    visualProgress += (serverProgress - visualProgress) * lerpSpeed;
    visualProgressMap.set(tileKey, visualProgress);

    const innerSize = size * camera.zoom * 0.9; 
    
    const corners: {x: number, y: number}[] = [];
    for (let j = 0; j < 6; j++) {
      const angle = (Math.PI / 3) * j - Math.PI / 2;
      corners.push({
        x: x + innerSize * Math.cos(angle),
        y: y + innerSize * Math.sin(angle)
      });
    }
    corners.push(corners[0]);

    ctx.save();
    ctx.strokeStyle = captureColor;
    ctx.lineWidth = Math.max(2, 4 * camera.zoom);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);

    const totalSides = 6;
    const currentProgress = Math.min(visualProgress, 1) * totalSides;

    for (let j = 0; j < totalSides; j++) {
      const sideProgress = Math.max(0, Math.min(1, currentProgress - j));
      if (sideProgress <= 0) break;

      const start = corners[j];
      const end = corners[j + 1];
      ctx.lineTo(
        start.x + (end.x - start.x) * sideProgress,
        start.y + (end.y - start.y) * sideProgress
      );
    }

    ctx.stroke();
    ctx.restore();
  }
}

/**
 * BATCH PASS 5: Industrial construction/demolition progress gauges.
 */
export function drawBuildingProgressBarsBatch(
  ctx: CanvasRenderingContext2D,
  items: any[],
  size: number
) {
  const now = getServerNow();
  const s = size * camera.zoom * 0.35;
  const barWidth = s * 1.5;
  const barHeight = Math.max(4, 5 * camera.zoom);
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { x, y, tile } = item;
    if (!tile.buildingAction) continue;

    const action = tile.buildingAction;
    const totalDurationMs = (action.actionType === "CONSTRUCTING"
      ? BUILDING_CONSTRUCTION_TIME[action.building as BuildingType]
      : BUILDING_DEMOLISH_TIME[action.building as BuildingType]) * 1000;

    const timeLeft = action.readyAt - now;
    const progress = Math.max(0, Math.min(1, 1 - (timeLeft / totalDurationMs)));

    const barX = x - barWidth / 2;
    const barY = y + s * 1.0; 

    ctx.save();
    ctx.fillStyle = "rgba(10, 12, 15, 0.85)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, barHeight / 2);
    ctx.fill();
    ctx.stroke();

    if (progress > 0) {
      ctx.fillStyle = action.actionType === "CONSTRUCTING" ? "#34d399" : "#f87171";
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth * progress, barHeight, barHeight / 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * OPTIMIZED: Uses flat positional parameters to eliminate anonymous 
 * config wrapper object instantiations from your core map sweep loop.
 */
export function getTileColor(
  tile: TileState,
  hovered: boolean,
  state: any,
  playerId: PlayerId,
  isCutOff: boolean,
  connectedByPlayer: Map<PlayerId, Set<string>>
) {
  let color = "#444";
  const owner = tile.ownerId ? state.players.get(tile.ownerId) : null;

  if (!owner) {
    color = "#33333377";
  } else {
    color = owner.color;
  }

  //if (tile.defense > 1) {
  //  if (owner) color = darken(owner.color, 0.75);
  //  else color = "#202020ff";
  //}

  let fillAlpha = FILL_ALPHA;
  if (isCutOff) {
    fillAlpha = 0.18;
  }

  if (tile.terrain === "BEDROCK") {
    color = "#111"; 
    fillAlpha = 1;
  }

  if (hovered) {
    const ok = canCaptureClient(state, playerId, tile.q, tile.r, connectedByPlayer);
    color = ok ? "#6b7cff" : "rgba(216, 121, 121, 1)";
    fillAlpha = 0.45;
  }

  return { color, fillAlpha };
}

export function drawHexStripes(ctx: CanvasRenderingContext2D, pts: Array<[number, number]>) {
  ctx.save();
  ctx.clip();
  ctx.fillStyle = getStripePattern(ctx)!;
  ctx.fillRect(pts[0][0] - 100, pts[0][1] - 100, 200, 200);
  ctx.restore();
}