import type { CoreGameState } from "../../../system/index.js";
import type { GameMapDefinition } from "../../../system/maps/types.js";
import { TERRAIN_BASE_DEFENSE } from "../../../system/core/serverConstants.js";

export function initMap(
  state: CoreGameState,
  map: GameMapDefinition
) {

  state.tiles.clear();

  for (const hex of map.hexes) {
    state.tiles.set(`${hex.q},${hex.r}`, {
    q: hex.q,
    r: hex.r,
    ownerId: null,
    building: null,
    terrain: hex.terrain,
    baseDefense: TERRAIN_BASE_DEFENSE[hex.terrain],
    defense: TERRAIN_BASE_DEFENSE[hex.terrain],
    capture: null,
    defenseHeat: 0,
    lastDefendedAt: 0,
    buildingAction: null,
    effects: []
  });
  }

  state.mapId = map.id;
  state.mapName = map.name;
}
