// --- IN YOUR TEXT RENDERING FILE ---
import { camera } from "./camera.js";

/**
 * HIGH-PERFORMANCE TEXT PIPELINE:
 * Completely removes individual context state saving/restoring, shadow blurs, 
 * and redundant coordinate geometry calculations.
 */
export function drawHexTextBatch(
  ctx: CanvasRenderingContext2D,
  items: Array<{
    x: number;
    y: number;
    tile: any;
  }>,
  size: number
) {
  if (items.length === 0) return;

  // 1. Uniformly cache pipeline state ONCE for all texts
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.max(10, 12 * camera.zoom)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const renderSize = size * camera.zoom;
  const buildingOffset = renderSize * 0.5;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { x, y, tile } = item;
    
    // Read directly from the existing tile data passed down the pipeline
    const text = tile.defense.toString();
    const hasBuilding = !!tile.building || !!tile.buildingAction;
    
    // Shift text position upward if a structural foundation pad is present
    const targetY = hasBuilding ? (y - buildingOffset) : y;

    // 2. High performance text drop-shadow alternative (Instantaneous drop contrast)
    ctx.fillStyle = "#000000";
    ctx.fillText(text, x + 1, targetY + 1); // Subtle southeast dark offset contrast

    // 3. Draw the main foreground numbers
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText(text, x, targetY);
  }

  ctx.restore();
}