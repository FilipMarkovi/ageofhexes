import type { CoreGameState, PlayerId, BuildingType } from "./gameTypes.js"; 
import { CAPTURE_RATE, MAX_ATTACKTIME_INCREASE, TILES_UNTIL_MAX_ATTACKTIME_INCREASE } from "./index.js";

function createZeroedBuildingCounts() {
  return {
    barracks: 0,
    fort: 0,
    house: 0,
    laboratory: 0,
    siege_outpost: 0,
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