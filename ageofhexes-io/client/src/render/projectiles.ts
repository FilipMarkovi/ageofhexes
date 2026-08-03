import { HEX_SIZE } from "../../../shared/constants.js";
import { getServerNow } from "../utils/time.js";
import { camera } from "./camera.js";
import { projectileImages } from "./assetManager.js";

type ProjectileInstance = {
  attackType: string;
  sourceQ: number;
  sourceR: number;
  targetQ: number;
  targetR: number;
  startAt: number;
  endAt: number;
};

const projectiles: ProjectileInstance[] = [];

function axialToScreen(q: number, r: number, canvas: HTMLCanvasElement) {
  const worldX = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const worldY = HEX_SIZE * (1.5 * r);

  return {
    x: (worldX - camera.x) * camera.zoom + canvas.width / 2,
    y: (worldY - camera.y) * camera.zoom + canvas.height / 2,
  };
}

export function enqueueProjectile(input: {
  attackType: string;
  sourceQ: number;
  sourceR: number;
  targetQ: number;
  targetR: number;
  travelMs: number;
  serverTime?: number;
}) {
  const launchBaseTime = input.serverTime ?? getServerNow();
  projectiles.push({
    attackType: input.attackType,
    sourceQ: input.sourceQ,
    sourceR: input.sourceR,
    targetQ: input.targetQ,
    targetR: input.targetR,
    startAt: launchBaseTime,
    endAt: launchBaseTime + Math.max(1, input.travelMs),
  });
}

export function drawProjectiles(ctx: CanvasRenderingContext2D) {
  const now = getServerNow();

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const duration = Math.max(1, p.endAt - p.startAt);
    const t = (now - p.startAt) / duration;

    if (t >= 1) {
      projectiles.splice(i, 1);
      continue;
    }
    if (t < 0) continue;

    const start = axialToScreen(p.sourceQ, p.sourceR, ctx.canvas);
    const end = axialToScreen(p.targetQ, p.targetR, ctx.canvas);

    const x = start.x + (end.x - start.x) * t;
    const baseY = start.y + (end.y - start.y) * t;

    const distancePx = Math.hypot(end.x - start.x, end.y - start.y);
    const arcHeight = Math.max(10, Math.min(42, distancePx * 0.18));
    const y = baseY - arcHeight * 4 * t * (1 - t);

    const sprite = projectileImages[p.attackType];
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      const size = Math.max(12, 26 * camera.zoom);
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      continue;
    }

    ctx.save();
    ctx.fillStyle = "#c2410c";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(3, 5 * camera.zoom), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
