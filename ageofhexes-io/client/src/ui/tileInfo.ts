import type { CoreGameState, TileState } from "../../../shared/index.js";
import { DEFEND_COST_RATIO, DEFENSE_HEAT_DECAY_MS, DEFENSE_COST_INCREMENT } from "../../../shared/constants.js";
import { getServerNow } from "../utils/time.js";
import { connectedByPlayer } from "../main.js";

export function drawTileInfo(
  ctx: CanvasRenderingContext2D,
  tile: TileState,
  state: CoreGameState,
  me: string
) {
  ctx.save();
  const now = getServerNow();

  const width = 240; // Widened slightly to give badges more room
  const padding = 16;
  const lineHeight = 22;
  const x = ctx.canvas.width - width - 20;
  
  let currentY = 20; // Keeps track of vertical stacking

  const isMine = tile.ownerId === me;
  const owner = tile.ownerId ? state.players.get(tile.ownerId) : null;
  const ownerColor = isMine ? "#60a5fa" : (owner?.color ?? "#9ca3af");
  const ownerName = isMine ? "You" : (owner?.username ?? "Neutral");

  // ==========================================
  // CARD 1: TILE INFORMATION
  // ==========================================
  const tileLines: { label: string; value: string; color?: string }[] = [
    { label: "TERRAIN", value: tile.terrain, color: getTerrainColor(tile.terrain) },
  ];

  if (tile.building) {
    tileLines.push({ label: "BUILDING", value: tile.building.replace(/_/g, " "), color: "#facc15" });
  }

  if (tile.specialBuilding) {
    tileLines.push({ label: "BUILDING", value: tile.specialBuilding.replace(/_/g, " "), color: "#ae4905" });
  }

  tileLines.push({ label: "BASE DEF", value: tile.baseDefense.toString() });
  tileLines.push({ label: "TOTAL DEF", value: tile.defense.toString(), color: "#f97316" });

  // Defense Cost Logic
  if (owner) {
    let costPercent = Math.round((tile.defenseHeat * DEFENSE_COST_INCREMENT + DEFEND_COST_RATIO) * 100);
    let timerText = "";
    if (tile.defenseHeat > 0) {
      const secondsLeft = Math.ceil((DEFENSE_HEAT_DECAY_MS - (now - tile.lastDefendedAt)) / 1000);
      timerText = ` (${secondsLeft}s)`;
      if (secondsLeft < 0) {
        costPercent = DEFEND_COST_RATIO * 100;
        timerText = "";
      }
    }
    tileLines.push({ 
      label: "DEFENSE COST", 
      value: `${costPercent}%${timerText}`, 
      color: tile.defenseHeat > 0 ? "#f87171" : "#34d399" 
    });
  }

  if (now - tile.lastDefendedAt < 1000) {
    tileLines.push({ label: "STATUS", value: "ATTACK COOLDOWN", color: "#fbbf24" });
  }

  // Calculate base text height for Tile Card
  let tileCardHeight = padding * 2 + tileLines.length * lineHeight;

  // Append extra space if tile has bulletin effects
  const hasTileEffects = tile.effects && tile.effects.length > 0;
  if (hasTileEffects) {
    tileCardHeight += 32; // Extra breathing room for the bulletin layout
  }

  // Draw Card 1 Background
  ctx.fillStyle = "rgba(15, 15, 20, 0.9)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, x, currentY, width, tileCardHeight, 10);
  ctx.fill();
  ctx.stroke();

  // Draw Left Accent Bar
  ctx.fillStyle = getTerrainColor(tile.terrain);
  drawRoundedRect(ctx, x, currentY, 4, tileCardHeight, { tl: 10, bl: 10, tr: 0, br: 0 });
  ctx.fill();

  // Render Card 1 Text Rows
  ctx.textBaseline = "top";
  let ty = currentY + padding;
  for (const line of tileLines) {
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.textAlign = "left";
    ctx.fillText(line.label, x + padding + 8, ty + 2);

    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = line.color ?? "#ffffff";
    ctx.textAlign = "right";
    ctx.fillText(line.value, x + width - padding, ty);
    ty += lineHeight;
  }

  // Render Tile Bulletin Badges
  if (hasTileEffects) {
    renderBulletinList(ctx, x + padding + 8, ty + 6, tile.effects, "#a855f7", "rgba(168, 85, 247, 0.15)");
  }

  // Shift cursor down for Card 2
  currentY += tileCardHeight + 14; 

  // ==========================================
  // CARD 2: PLAYER / OWNER INFORMATION (Only shows if tile has an owner)
  // ==========================================
  if (owner) {
    const ownedTerritory = connectedByPlayer.get(owner.id)?.size ?? 0;
    const capturableTileCount = Array.from(state.tiles.values()).reduce((sum, stateTile) => {
      return stateTile.terrain !== "WATER" && stateTile.terrain !== "BEDROCK"
        ? sum + 1
        : sum;
    }, 0);
    const territoryPercent = capturableTileCount > 0
      ? Math.round((ownedTerritory / capturableTileCount) * 100)
      : 0;

    const playerLines: { label: string; value: string; color?: string }[] = [
      { label: "OWNER", value: ownerName, color: ownerColor }
    ];

    playerLines.push({ label: "ARMY", value: Math.round(owner.army).toLocaleString(), color: "#ef4444" });
    playerLines.push({ label: "GOLD", value: Math.round(owner.gold).toLocaleString(), color: "#fbbf24" });
    playerLines.push({ label: "TERRITORY SIZE", value: `${ownedTerritory} (${territoryPercent}%)`, color: "#9ca3af" });

    let playerCardHeight = padding * 2 + playerLines.length * lineHeight;
    const hasPlayerEffects = owner.effects && owner.effects.length > 0;
    if (hasPlayerEffects) {
      playerCardHeight += 32; 
    }

    // Draw Card 2 Background
    ctx.fillStyle = "rgba(15, 15, 20, 0.9)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x, currentY, width, playerCardHeight, 10);
    ctx.fill();
    ctx.stroke();

    // Draw Left Accent Bar (Matches Player Color)
    ctx.fillStyle = ownerColor;
    drawRoundedRect(ctx, x, currentY, 4, playerCardHeight, { tl: 10, bl: 10, tr: 0, br: 0 });
    ctx.fill();

    // Render Card 2 Text Rows
    ty = currentY + padding;
    for (const line of playerLines) {
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.textAlign = "left";
      ctx.fillText(line.label, x + padding + 8, ty + 2);

      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = line.color ?? "#ffffff";
      ctx.textAlign = "right";
      ctx.fillText(line.value, x + width - padding, ty);
      ty += lineHeight;
    }

    // Render Player Bulletin Badges
    if (hasPlayerEffects) {
      renderBulletinList(ctx, x + padding + 8, ty + 6, owner.effects, "#06b6d4", "rgba(6, 182, 212, 0.15)");
    }
  }

  ctx.restore();
}

// ==========================================
// NEW HELPER: BULLETIN BADGE RENDERER
// ==========================================
function renderBulletinList(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  effects: any[],
  textColor: string,
  bgColor: string
) {
  ctx.textAlign = "left";
  ctx.font = "bold 9px sans-serif";
  
  let currentX = startX;

  effects.forEach((effect) => {
    const rawName = typeof effect === 'string' ? effect : (effect.type || effect.name || "UNKNOWN");
    const name = rawName.toUpperCase().replace(/_/g, " ");
    
    // Dynamic size sizing based on name text length
    const textWidth = ctx.measureText(name).width;
    const badgeWidth = textWidth + 12;
    const badgeHeight = 16;

    // Draw Badge Capsule Body
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 0.75;
    drawRoundedRect(ctx, currentX, startY, badgeWidth, badgeHeight, 4);
    ctx.fill();
    ctx.stroke();

    // Draw Badge Text
    ctx.fillStyle = textColor;
    ctx.fillText(name, currentX + 6, startY + 3);

    // Shift left-to-right for next badge item
    currentX += badgeWidth + 6;
  });
}

// Helper: Terrain Colors
function getTerrainColor(t: string) {
  if (t === "DESERT") return "#dd9f1b";
  if (t === "MOUNTAIN") return "#8a8a8a";
  if (t === "WATER") return "#257db8";
  return "#6ee7b7"; // Grass
}

// Helper: Rounded Rect
function drawRoundedRect(ctx: any, x: number, y: number, w: number, h: number, r: any) {
  const c = typeof r === 'number' ? { tl: r, tr: r, br: r, bl: r } : r;
  ctx.beginPath();
  ctx.moveTo(x + c.tl, y);
  ctx.lineTo(x + w - c.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + c.tr);
  ctx.lineTo(x + w, y + h - c.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - c.br, y + h);
  ctx.lineTo(x + c.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - c.bl);
  ctx.lineTo(x, y + c.tl);
  ctx.quadraticCurveTo(x, y, x + c.tl, y);
  ctx.closePath();
}