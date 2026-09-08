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

type RockChunk = {
  angle: number;
  radius: number;
  points: { x: number; y: number }[];
  rotation: number;
  rotSpeed: number;
};

type GasParticle = {
  angle: number;
  speed: number;
  radius: number;
  driftUp: number;
};

type ImpactEffect = {
  kind: "BOMBARD" | "PLAGUE_BOMB";
  q: number;
  r: number;
  startAt: number;
  endAt: number;
  chunks?: RockChunk[];
  particles?: GasParticle[];
};

const projectiles: ProjectileInstance[] = [];
const impactEffects: ImpactEffect[] = [];
const PROJECTILE_ROTATION_PERIOD_MS = 1750;
const BOMBARD_IMPACT_DURATION_MS = 650;
const PLAGUE_IMPACT_DURATION_MS = 1400;
const BOMBARD_CHUNK_COUNT = 7;
const PLAGUE_PARTICLE_COUNT = 9;

function makeRockChunk(): RockChunk {
  const vertexCount = 5 + Math.floor(Math.random() * 2);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const a = (i / vertexCount) * Math.PI * 2;
    const jaggedness = 2 + Math.random() * 3;
    points.push({ x: Math.cos(a) * jaggedness, y: Math.sin(a) * jaggedness });
  }
  return {
    angle: Math.random() * Math.PI * 2,
    radius: 14 + Math.random() * 22,
    points,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 6,
  };
}

function makeGasParticle(): GasParticle {
  return {
    angle: Math.random() * Math.PI * 2,
    speed: 6 + Math.random() * 14,
    radius: 3 + Math.random() * 4,
    driftUp: 10 + Math.random() * 18,
  };
}

function spawnImpactEffect(attackType: string, q: number, r: number, at: number) {
  if (attackType === "BOMBARD") {
    const chunks: RockChunk[] = [];
    for (let i = 0; i < BOMBARD_CHUNK_COUNT; i++) chunks.push(makeRockChunk());
    impactEffects.push({ kind: "BOMBARD", q, r, startAt: at, endAt: at + BOMBARD_IMPACT_DURATION_MS, chunks });
  } else if (attackType === "PLAGUE_BOMB") {
    const particles: GasParticle[] = [];
    for (let i = 0; i < PLAGUE_PARTICLE_COUNT; i++) particles.push(makeGasParticle());
    impactEffects.push({ kind: "PLAGUE_BOMB", q, r, startAt: at, endAt: at + PLAGUE_IMPACT_DURATION_MS, particles });
  }
}

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

function drawImpactEffects(ctx: CanvasRenderingContext2D, now: number) {
  for (let i = impactEffects.length - 1; i >= 0; i--) {
    const fx = impactEffects[i];
    const duration = Math.max(1, fx.endAt - fx.startAt);
    const t = (now - fx.startAt) / duration;

    if (t >= 1) {
      impactEffects.splice(i, 1);
      continue;
    }
    if (t < 0) continue;

    const center = axialToScreen(fx.q, fx.r, ctx.canvas);
    const zoom = Math.max(0.1, camera.zoom);

    if (fx.kind === "BOMBARD" && fx.chunks) {
      const fade = 1 - t;
      for (const chunk of fx.chunks) {
        const travel = chunk.radius * zoom * (t * 1.6);
        const cx = center.x + Math.cos(chunk.angle) * travel;
        const fallGravity = 90 * zoom * t * t;
        const cy = center.y + Math.sin(chunk.angle) * travel + fallGravity;
        const scale = zoom * (1 - t * 0.3);
        const rot = chunk.rotation + chunk.rotSpeed * t;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.globalAlpha = Math.max(0, fade);
        ctx.fillStyle = "#57534e";
        ctx.strokeStyle = "#292524";
        ctx.lineWidth = 1;
        ctx.beginPath();
        chunk.points.forEach((pt, idx) => {
          const x = pt.x * scale;
          const y = pt.y * scale;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    } else if (fx.kind === "PLAGUE_BOMB" && fx.particles) {
      const fade = 1 - t;
      for (const particle of fx.particles) {
        const travel = particle.speed * zoom * t;
        const px = center.x + Math.cos(particle.angle) * travel;
        const py = center.y + Math.sin(particle.angle) * travel - particle.driftUp * zoom * t;
        const radius = (particle.radius + particle.radius * 2.5 * t) * zoom;

        ctx.save();
        ctx.globalAlpha = Math.max(0, fade * 0.75);
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
        gradient.addColorStop(0, "rgba(134, 239, 172, 0.9)");
        gradient.addColorStop(0.6, "rgba(74, 222, 128, 0.45)");
        gradient.addColorStop(1, "rgba(74, 222, 128, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

export function drawProjectiles(ctx: CanvasRenderingContext2D) {
  const now = getServerNow();

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const duration = Math.max(1, p.endAt - p.startAt);
    const t = (now - p.startAt) / duration;

    if (t >= 1) {
      spawnImpactEffect(p.attackType, p.targetQ, p.targetR, p.endAt);
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
      const angle = ((now - p.startAt) / PROJECTILE_ROTATION_PERIOD_MS) * Math.PI * 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      ctx.restore();
      continue;
    }

    ctx.save();
    ctx.fillStyle = "#c2410c";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(3, 5 * camera.zoom), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawImpactEffects(ctx, now);
}
