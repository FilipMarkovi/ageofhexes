import { GAMER_NAMES } from "./serverConstants.js";
import { key } from "./state.js";

export function getRandomNames(count: number): string[] {
  // 1. Create a shallow copy
  const shuffled = [...GAMER_NAMES];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

// get all tiles in a circle with radius O(r^2)
export function getTilesInRange(Tq: number, Tr:number, radius: number): Set<string> {
  const results = new Set<string>();

  for (let dq = -radius; dq <= radius; dq++) {
    const startDr = Math.max(-radius, -dq - radius);
    const endDr = Math.min(radius, -dq + radius);

    for (let dr = startDr; dr <= endDr; dr++) {
      const q = Tq + dq;
      const r = Tr + dr;
      
      results.add(key(q, r));
    }
  }

  return results;
}


const HEX_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

// get all tiles in a ring radius O(r)
export function getTileRing(Tq: number, Tr: number, radius: number): Set<string> {
  const results = new Set<string>();
  
  // Radius 0 is just the center itself
  if (radius === 0) {
    results.add(key(Tq, Tr));
    return results;
  }

  // 1. Start at a corner (e.g., move 'radius' steps in direction 4)
  let q = Tq + HEX_DIRECTIONS[4].q * radius;
  let r = Tr + HEX_DIRECTIONS[4].r * radius;

  // 2. Step through each of the 6 sides
  for (let side = 0; side < 6; side++) {
    // On each side, move 'radius' times
    for (let step = 0; step < radius; step++) {
      results.add(key(q, r));
      
      // Move in the direction of the next side
      q += HEX_DIRECTIONS[side].q;
      r += HEX_DIRECTIONS[side].r;
    }
  }

  return results;
}

