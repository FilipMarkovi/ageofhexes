
import type { PlayerId, PlayerState, TileState, GamePhase } from "../../shared/index.js";
import { getConnectedTilesFromHQ, handlePlayerDeath, recalcDefense } from "./systems.js";
import { MIN_HQ_DISTANCE } from "./serverConstants.js";

export interface CoreGameState {
  phase: GamePhase;
  tiles: Map<string, TileState>;
  players: Map<PlayerId, PlayerState>;
  started: boolean;
  gameOver: null | { winner: PlayerId; };
  connectedCache?: Map<PlayerId, Set<string>> | null;
  mapId: null | string;
  mapName: null | string;
  HQLocations: Map<PlayerId, TileState>;
  placementTimeLeft?: number;
} // copy in shared

export function createGameState(): CoreGameState {
  return {
    phase: "HQ_PLACEMENT",
    tiles: new Map(),
    players: new Map(),
    started: false,
    gameOver: null,
    connectedCache: null,
    mapId: null,
    mapName: null,
    HQLocations: new Map(),
    placementTimeLeft: 15,
  };
}

export function key(q: number, r: number) {
  return `${q},${r}`;
}

export function getTile(state: CoreGameState, q: number, r: number) {
  return state.tiles.get(key(q, r));
}

export function setPlayer(state: CoreGameState, player: PlayerState) {
  state.players.set(player.id, player);
}

// Hex axial neighbors (pointy-top axial)
export const DIRS: Array<{ q: number; r: number }> = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 }
];

export function neighbors(q: number, r: number) {
  return DIRS.map(d => ({ q: q + d.q, r: r + d.r }));
}

export function isAdjacentOwned(state: CoreGameState, q: number, r: number, ownerId: PlayerId): boolean {
  return neighbors(q, r).some(n => {
    const t = getTile(state, n.q, n.r);
    return !!t && t.ownerId === ownerId;
  });
}

export function neighborTiles(state: CoreGameState, q: number, r: number): any {
  let found = Array()
  neighbors(q, r).forEach(n => {
    const t = getTile(state, n.q, n.r);
    found.push(t)
  });
  return found;
}

export function nonOwnedNeighbors(state: CoreGameState, q: number, r: number, ownerId: PlayerId): any {
  let found = Array()
  neighbors(q, r).some(n => {
    const t = getTile(state, n.q, n.r);
    if (t && t.ownerId != ownerId)
    found.push(n)
  });
  return found;
}

export function isAdjacentOwnedAndConnected(
  state: CoreGameState,
  q: number,
  r: number,
  playerId: PlayerId
): boolean {
  const connected = getConnectedTilesFromHQ(state, playerId);

  return neighbors(q, r).some(n => {
    const t = getTile(state, n.q, n.r);
    if (!t) return false;
    if (t.ownerId !== playerId) return false;
    return connected.has(key(t.q, t.r));
  });
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

export function handlePlaceHQ(
  state: CoreGameState, 
  playerId: PlayerId, 
  q: number, 
  r: number
): { success: boolean; error?: string } {
  
  // 1. Enforce phase restriction
  if (state.phase !== "HQ_PLACEMENT") {
    return { success: false, error: "HQ placement phase has concluded." };
  }

  const tileKey = `${q},${r}`;
  const targetTile = state.tiles.get(tileKey);

  // 2. Base Validation Rules
  if (!targetTile) return { success: false, error: "Tile does not exist." };
  if (targetTile.terrain === "BEDROCK" || targetTile.terrain === "WATER") {
    return { success: false, error: "Cannot establish an HQ on this terrain." };
  }
  
  // If the tile is already owned by someone else
  if (targetTile.ownerId !== null && targetTile.ownerId !== playerId) {
    return { success: false, error: "This tile is already claimed by another player." };
  }

  if(targetTile.building !== null){
    return { success: false, error: "This tile already has a building on it." };
  }

  // 3. PREVENTION: Check proximity to other player HQs
  for (const [otherPlayerId, oldHQLocation] of state.HQLocations.entries()) {
    if (otherPlayerId === playerId) continue; // Skip checking against yourself
    
    // Calculate axial/hex distance between the target tile and existing HQs
    const distance = getHexDistance(q, r, oldHQLocation.q, oldHQLocation.r);
    if (distance < MIN_HQ_DISTANCE) {
      return { success: false, error: `Too close to an enemy HQ! Must be at least ${MIN_HQ_DISTANCE} tiles away.` };
    }
  }

  // 4. REPLACEMENT LOGIC: Clean up old HQ if this player already placed one
  const existingHQ = state.HQLocations.get(playerId);
  if (existingHQ) {
    existingHQ.ownerId = null;
    existingHQ.building = null;
    existingHQ.defense = existingHQ.baseDefense;
  }

  // 5. Apply New HQ State (No auto-capturing surrounding ring!)
  targetTile.ownerId = playerId;
  targetTile.building = "HQ";

  // 6. Register Location in State Caching
  state.HQLocations.set(playerId, targetTile);

  return { success: true };
}

function getHexDistance(q1: number, r1: number, q2: number, r2: number): number {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

export function startHQPlacementCountdown(state: CoreGameState, roomId: string) {
  state.phase = "HQ_PLACEMENT";
  state.started = true
  state.placementTimeLeft = 15;

  const timerInterval = setInterval(() => {
    if (!state.placementTimeLeft) state.placementTimeLeft = 0;
    state.placementTimeLeft--;

    if (state.placementTimeLeft <= 0) {
      clearInterval(timerInterval);
      endHQPlacementAndEliminate(state, roomId);
    }
  }, 1000);
}

function endHQPlacementAndEliminate(state: CoreGameState, roomId: string) {

  // 1. Identify and eliminate players who failed to place an HQ
  for (const [playerId, player] of state.players.entries()) {
    if (!state.HQLocations.has(playerId)) {
      handlePlayerDeath(state, playerId)
    }
  }

  for (const [playerId, hqTile] of state.HQLocations.entries()) {
    const player = state.players.get(playerId);
    if (player) {
      player.hqPos = { q: hqTile.q, r: hqTile.r }; 
    }
  }

  // 2. Transition Game State Phases
  state.phase = "GAMEPLAY";

  if (state.connectedCache) {
    state.connectedCache = new Map();
  }

  recalcDefense(state)
}