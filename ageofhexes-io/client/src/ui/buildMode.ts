import type { BuildingType } from "../../../shared/index.js";
import { BUILDING_COST, BUILDING_LIMIT } from "../../../shared/constants.js";
import { clientUIState } from "../state/clientState.js";
import { clientNetState } from "../state/clientState.js";

export function toggleBuildMode(type: BuildingType) {
  const state = clientNetState.state;
  const me = clientNetState.playerId;
  if (!state || !me) return;

  const player = state.players.get(me);
  if (!player) return;

  const cost = BUILDING_COST[type];
  const countkey = type.toString().toLowerCase() as keyof typeof player.buildings;

  // not enough gold or limit reached skip
  if (player.gold < cost || (player.buildings[countkey] >= BUILDING_LIMIT[type])) return;

  // clear ability so they cant build and buy ability at the same time
  clientUIState.selectedAbility = null;

  // Toggle behavior
  if (clientUIState.selectedBuilding === type) {
    clientUIState.selectedBuilding = null;
  } else {
    clientUIState.selectedBuilding = type;
  }
}


export function clearBuildMode() {
  clientUIState.selectedBuilding = null;
}
