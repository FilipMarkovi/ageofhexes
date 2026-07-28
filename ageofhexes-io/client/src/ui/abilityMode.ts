import { clientUIState, clientNetState } from "../state/clientState.js";
import { PlayerEffectType } from "../../../shared/index.js";
import { EFFECT_COSTS } from "../../../shared/constants.js";

export function toggleAbilityMode(type: PlayerEffectType) {
  const state = clientNetState.state;
  const me = clientNetState.playerId;
  if (!state || !me) return;

  const player = state.players.get(me);
  if (!player) return;

  const hasLab = (player.buildings.laboratory ?? 0) > 0;
  if (!hasLab) return;

  const cost = EFFECT_COSTS[type];
  if (player.gold < cost) return;

  // Clear build mode so the player isn't trying to build AND cast at once
  clientUIState.selectedBuilding = null;

  // Toggle behavior
  if (clientUIState.selectedAbility === type) {
    clientUIState.selectedAbility = null;
  } else {
    clientUIState.selectedAbility = type;
  }
}

export function clearAbilityMode() {
  clientUIState.selectedAbility = null;
}