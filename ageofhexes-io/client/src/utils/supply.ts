import type { CoreGameState, PlayerId, WaterNetwork } from "../../../shared/index.js";
import { HEX_DIRECTIONS } from "../../../shared/constants.js";
import { buildWaterNetwork, computeConnectedTilesViaHarbors } from "../../../shared/util.js";

export function key(q: number, r: number) {
  return `${q},${r}`;
}

export function neighbors(q: number, r: number) {
  return HEX_DIRECTIONS.map(d => ({ q: q + d.q, r: r + d.r }));
}
export function getConnectedTilesFromHQ_Client(
  state: CoreGameState,
  playerId: PlayerId,
  precomputedWaterNetwork?: WaterNetwork | null
): Set<string> {
  const player = state.players.get(playerId);
  const waterNetwork = precomputedWaterNetwork ?? buildWaterNetwork(state);

  return computeConnectedTilesViaHarbors(
    state,
    playerId,
    player?.hqPos ?? null,
    waterNetwork
  );
}
