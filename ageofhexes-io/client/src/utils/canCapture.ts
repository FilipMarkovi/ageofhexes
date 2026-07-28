// client/utils/canCaptureClient.ts
import { PlayerId, CoreGameState } from "../../../shared/index.js";
import { BASE_CAPTURE_COST, HEX_DIRECTIONS } from "../../../shared/constants.js";

export function captureCost(defense: number) {
  return BASE_CAPTURE_COST * defense;
}

export function key(q: number, r: number) {
  return `${q},${r}`;
}

export function neighbors(q: number, r: number) {
  return HEX_DIRECTIONS.map(d => ({ q: q + d.q, r: r + d.r }));
}

export function canCaptureClient(
  state: CoreGameState,
  playerId: PlayerId,
  q: number,
  r: number,
  connectedByPlayer: Map<PlayerId, Set<string>>
): boolean {
  const tile = state.tiles.get(key(q, r));
  const player = state.players.get(playerId);
  if (!tile || !player) return false;
  if (tile.ownerId === playerId) return false;

  const connected = connectedByPlayer.get(playerId);
  if (!connected) return false;

  // must be adjacent to an OWNED + CONNECTED tile
  for (const n of neighbors(q, r)) {
    const key = `${n.q},${n.r}`;
    const t = state.tiles.get(key);
    if (t?.ownerId === playerId && connected.has(key)) {
      return player.army >= captureCost(tile.defense);
    }
  }

  return false;
}
