import type { CoreGameState, PlayerId, BuildingType, WaterBody, WaterNetwork } from "./gameTypes.js"; 
import { CAPTURE_RATE, MAX_ATTACKTIME_INCREASE, TILES_UNTIL_MAX_ATTACKTIME_INCREASE } from "./index.js";
import type { PlayerState } from "./index.js";
import { EFFECT_STRENGTHS } from "./constants.js";

function createZeroedBuildingCounts() {
  return {
    barracks: 0,
    fort: 0,
    house: 0,
    laboratory: 0,
    siege_outpost: 0,
    harbor: 0,
  };
}

const pendingQueueMap = new Map<PlayerId, ReturnType<typeof createZeroedBuildingCounts>>();

function getOrCreatePendingData(playerId: PlayerId) {
  let data = pendingQueueMap.get(playerId);
  if (!data) {
    data = createZeroedBuildingCounts();
    pendingQueueMap.set(playerId, data);
  }
  return data;
}

export function getActiveCount(state: CoreGameState, playerId: PlayerId, type: BuildingType): number {
  const player = state.players.get(playerId);
  if (!player) return 0;
  const bKey = type.toLowerCase() as keyof typeof player.buildings;
  return player.buildings[bKey] || 0;
}

export function getPendingCount(playerId: PlayerId, type: BuildingType): number {
  const data = getOrCreatePendingData(playerId);
  const bKey = type.toLowerCase() as keyof typeof data;
  return data[bKey];
}

export function getTotalPlannedCount(state: CoreGameState, playerId: PlayerId, type: BuildingType): number {
  return getActiveCount(state, playerId, type) + getPendingCount(playerId, type);
}

export function incrementPending(playerId: PlayerId, type: BuildingType): void {
  const data = getOrCreatePendingData(playerId);
  const bKey = type.toLowerCase() as keyof typeof data;
  data[bKey]++;
}

export function decrementPending(playerId: PlayerId, type: BuildingType): void {
  const data = getOrCreatePendingData(playerId);
  const bKey = type.toLowerCase() as keyof typeof data;
  data[bKey] = Math.max(0, data[bKey] - 1); 
}

export function clearPendingTracker(playerId: PlayerId): void {
  pendingQueueMap.delete(playerId);
}

export function calculateCaptureRate(
  tileDefense: number,
  targetTerritorySize: number, // Territory size of the player who OWNS the tile
  speedBoost: number
): number {
  // Base time in seconds (Defense divided by CAPTURE_RATE constant)
  const baseSeconds = Math.max(1, tileDefense) / CAPTURE_RATE;

  // Extra time based on the TARGET'S territory
  // If neutral tile (owner is null/undefined), targetTerritorySize is 0 → extraSeconds = 0
  const territoryRatio = Math.min(1.0, targetTerritorySize / TILES_UNTIL_MAX_ATTACKTIME_INCREASE);
  const extraSeconds = territoryRatio * MAX_ATTACKTIME_INCREASE;

  // Apply attack speed buff of the ATTACKER (divides overall duration)
  const totalDurationSeconds = (baseSeconds + extraSeconds) / Math.max(0.1, speedBoost);

  // Rate = fraction of work completed per second
  return totalDurationSeconds > 0 ? (1 / totalDurationSeconds) : 0;
}

export const DIRS: Array<{ q: number; r: number }> = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 }
];

// Helper to avoid redundant splitting logic
export function parseKey(k: string): { q: number; r: number } {
  const commaIndex = k.indexOf(",");
  return {
    q: parseInt(k.substring(0, commaIndex), 10),
    r: parseInt(k.substring(commaIndex + 1), 10),
  };
}

export function key(q: number, r: number) {
  return `${q},${r}`;
}

export function neighbors(q: number, r: number) {
  return DIRS.map(d => ({ q: q + d.q, r: r + d.r }));
}

export function neighborTiles(state: CoreGameState, q: number, r: number): any {
  let found = Array()
  neighbors(q, r).forEach(n => {
    const t = state.tiles.get(key(n.q, n.r));
    found.push(t)
  });
  return found;
}

export function hexDistance(
  a: { q: number; r: number },
  b: { q: number; r: number }
): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = (a.q + a.r) - (b.q + b.r);

  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}

export function getHexDistance(q1: number, r1: number, q2: number, r2: number): number {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

export function hasHyperinflation(player: PlayerState | null | undefined): boolean {
  return player?.effects.some((effect) => effect.type === "HYPERINFLATION") ?? false;
}

export function getEffectiveGoldCost(
  player: PlayerState | null | undefined,
  baseCost: number
): number {
  const inflationMultiplier = hasHyperinflation(player)
    ? (EFFECT_STRENGTHS["HYPERINFLATION"] ?? 1.5)
    : 1;

  return Math.max(0, Math.ceil(baseCost * inflationMultiplier));
}


/**
 * Run ONCE at match initialization / map load.
 * Groups all water tiles into unique bodies of water and tracks which land tiles touch them.
 */
export function buildWaterNetwork(state: CoreGameState) {
  const visitedWater = new Set<string>();
  const waterBodies: WaterBody[] = [];
  
  // Fast reverse lookup: LandTileKey -> Set of WaterBodyIDs it touches
  const landToWaterBodies = new Map<string, Set<number>>();

  let bodyIdCounter = 1;

  for (const [tileKey, tile] of state.tiles.entries()) {
    if (tile.terrain !== "WATER" || visitedWater.has(tileKey)) continue;

    // Found an unvisited water tile -> Discover the whole body of water via BFS
    const currentBodyId = bodyIdCounter++;
    const waterTiles = new Set<string>();
    const coastalLandTiles = new Set<string>();

    const queue: string[] = [tileKey];
    visitedWater.add(tileKey);

    while (queue.length > 0) {
      const currKey = queue.shift()!;
      waterTiles.add(currKey);

      const { q, r } = parseKey(currKey);

      for (const n of neighbors(q, r)) {
        const nKey = key(n.q, n.r);
        const neighborTile = state.tiles.get(nKey);
        if (!neighborTile) continue;

        if (neighborTile.terrain === "WATER") {
          if (!visitedWater.has(nKey)) {
            visitedWater.add(nKey);
            queue.push(nKey);
          }
        } else {
          // It's a land tile touching this body of water!
          coastalLandTiles.add(nKey);

          if (!landToWaterBodies.has(nKey)) {
            landToWaterBodies.set(nKey, new Set());
          }
          landToWaterBodies.get(nKey)!.add(currentBodyId);
        }
      }
    }

    waterBodies.push({
      id: currentBodyId,
      waterTiles,
      coastalLandTiles,
    });
  }

  return { waterBodies, landToWaterBodies };
}

// Check if two land tiles are connected via the same body of water (fast O(1) lookup)
export function isConnectedViaWaterFast(
  landToWaterBodies: Map<string, Set<number>>,
  startLandKey: string,
  endLandKey: string
): boolean {
  const startBodies = landToWaterBodies.get(startLandKey);
  const endBodies = landToWaterBodies.get(endLandKey);

  if (!startBodies || !endBodies) return false;

  // Check if they share at least ONE common Water Body ID
  for (const bodyId of startBodies) {
    if (endBodies.has(bodyId)) return true;
  }

  return false;
}

/**
 * Finds the tile key of the attacker's closest Harbor sharing a body of water with the target tile.
 * Uses straight-line hex distance (getHexDistance) for instant resolution.
 * 
 * @returns The tile key of the closest valid Harbor, or null if no connected Harbor exists.
 */
export function getClosestNavalHarborKey(
  state: CoreGameState,
  playerId: string,
  targetLandKey: string,
  waterNetwork: {
    landToWaterBodies: Map<string, Set<number>>;
  }
): string | null {
  // 1. Get the Water Body IDs touching the target land tile
  const targetWaterBodyIds = waterNetwork.landToWaterBodies.get(targetLandKey);
  if (!targetWaterBodyIds || targetWaterBodyIds.size === 0) {
    return null; // Target is not coastal / touching water
  }

  const targetPos = parseKey(targetLandKey);
  let closestHarborKey: string | null = null;
  let minHexDistance = Infinity;

  // 2. Iterate over all tiles to find the player's harbors
  for (const [tileKey, tile] of state.tiles.entries()) {
    if (
      tile.ownerId === playerId &&
      (tile.building === "HARBOR")
    ) {
      // Check if this harbor shares ANY body of water with the target tile
      const harborWaterBodyIds = waterNetwork.landToWaterBodies.get(tileKey);
      if (!harborWaterBodyIds) continue;

      let sharesWaterBody = false;
      for (const bodyId of harborWaterBodyIds) {
        if (targetWaterBodyIds.has(bodyId)) {
          sharesWaterBody = true;
          break;
        }
      }

      // 3. Measure direct hex distance to find the closest valid harbor
      if (sharesWaterBody) {
        const harborPos = parseKey(tileKey);
        const dist = getHexDistance(harborPos.q, harborPos.r, targetPos.q, targetPos.r);

        if (dist < minHexDistance) {
          minHexDistance = dist;
          closestHarborKey = tileKey;
        }
      }
    }
  }

  return closestHarborKey;
}

/**
 * Fast A* search algorithm to find the shortest water path between a Harbor and a target tile.
 * Intermediate tiles MUST match terrainType, but start/end tiles are exempt.
 */
export function findPathOverTerrain(
  state: CoreGameState,
  startKey: string,
  endKey: string,
  terrainType: string
): string[] | null {
  if (startKey === endKey) return [startKey];

  const startPos = parseKey(startKey);
  const endPos = parseKey(endKey);

  const openSet = new Set<string>([startKey]);
  const cameFrom = new Map<string, string>();

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  gScore.set(startKey, 0);
  fScore.set(startKey, getHexDistance(startPos.q, startPos.r, endPos.q, endPos.r));

  while (openSet.size > 0) {
    // 1. O(N) extraction (MUCH faster than Array.sort which is O(N log N))
    let currentKey = "";
    let lowestF = Infinity;

    for (const nodeKey of openSet) {
      const score = fScore.get(nodeKey) ?? Infinity;
      if (score < lowestF) {
        lowestF = score;
        currentKey = nodeKey;
      }
    }

    if (currentKey === endKey) {
      const path = [currentKey];
      let curr = currentKey;
      while (cameFrom.has(curr)) {
        curr = cameFrom.get(curr)!;
        path.unshift(curr);
      }
      return path;
    }

    openSet.delete(currentKey);

    const { q: cq, r: cr } = parseKey(currentKey);

    for (const neighbor of neighbors(cq, cr)) {
      const nKey = key(neighbor.q, neighbor.r);

      // Target tile can be Land, but all intermediate steps MUST be Water
      if (nKey !== endKey && nKey !== startKey) {
        const tile = state.tiles.get(nKey);
        if (!tile || tile.terrain !== terrainType) continue;
      }

      const tentativeGScore = (gScore.get(currentKey) ?? 0) + 1;

      if (tentativeGScore < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, currentKey);
        gScore.set(nKey, tentativeGScore);
        fScore.set(nKey, tentativeGScore + hexDistance(neighbor, endPos));

        openSet.add(nKey); // O(1) insertion
      }
    }
  }

  return null;
}

/**
 * Hybrid supply traversal from HQ.
 * A player can traverse owned land normally, and can also "jump" across a water body
 * between owned coastal land tiles only if they own at least one Harbor in that body.
 */
export function computeConnectedTilesViaHarbors(
  state: CoreGameState,
  playerId: PlayerId,
  hqPos: { q: number; r: number } | null,
  waterNetwork: WaterNetwork | null
): Set<string> {
  const visited = new Set<string>();
  if (!playerId || !hqPos) return visited;

  const hqKey = key(hqPos.q, hqPos.r);
  const hqTile = state.tiles.get(hqKey);
  if (!hqTile || hqTile.ownerId !== playerId) return visited;

  const stack: string[] = [hqKey];
  visited.add(hqKey);

  const activatedBodies = new Set<number>();
  const bodyById = new Map<number, WaterBody>();
  if (waterNetwork) {
    for (const body of waterNetwork.waterBodies) {
      bodyById.set(body.id, body);
    }
  }

  while (stack.length > 0) {
    const curKey = stack.pop()!;
    const curPos = parseKey(curKey);

    // Regular owned-land connectivity
    for (const n of neighbors(curPos.q, curPos.r)) {
      const nKey = key(n.q, n.r);
      if (visited.has(nKey)) continue;

      const tile = state.tiles.get(nKey);
      if (!tile || tile.ownerId !== playerId) continue;

      visited.add(nKey);
      stack.push(nKey);
    }

    if (!waterNetwork) continue;

    const touchingBodies = waterNetwork.landToWaterBodies.get(curKey);
    if (!touchingBodies || touchingBodies.size === 0) continue;

    // Water bridge is unlocked only when the player owns a Harbor in that body.
    for (const bodyId of touchingBodies) {
      if (activatedBodies.has(bodyId)) continue;

      const body = bodyById.get(bodyId);
      if (!body) continue;

      let hasPlayerHarbor = false;
      for (const coastalKey of body.coastalLandTiles) {
        const coastalTile = state.tiles.get(coastalKey);
        if (coastalTile?.ownerId === playerId && coastalTile.building === "HARBOR") {
          hasPlayerHarbor = true;
          break;
        }
      }

      if (!hasPlayerHarbor) continue;
      activatedBodies.add(bodyId);

      for (const coastalKey of body.coastalLandTiles) {
        if (visited.has(coastalKey)) continue;
        const coastalTile = state.tiles.get(coastalKey);
        if (!coastalTile || coastalTile.ownerId !== playerId) continue;

        visited.add(coastalKey);
        stack.push(coastalKey);
      }
    }
  }

  return visited;
}

