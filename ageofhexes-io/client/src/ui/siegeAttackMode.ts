import type { SiegeAttackType } from "../../../shared/index.js";
import { SPECIAL_ATTACK_COSTS } from "../../../shared/constants.js";
import { clientUIState, clientNetState } from "../state/clientState.js";
import { getEffectiveGoldCost } from "../../../shared/util.js";

export function toggleSiegeAttackMode(type: SiegeAttackType) {
  const state = clientNetState.state;
  const me = clientNetState.playerId;
  if (!state || !me) return;

  const player = state.players.get(me);
  if (!player) return;

  const hasSiegeOutpost = (player.buildings.siege_outpost ?? 0) > 0;
  if (!hasSiegeOutpost) return;

  const cost = getEffectiveGoldCost(player, SPECIAL_ATTACK_COSTS[type]);
  if (player.gold < cost) return;

  clientUIState.selectedBuilding = null;
  clientUIState.selectedAbility = null;

  if (clientUIState.selectedSpecialAttack === type) {
    clientUIState.selectedSpecialAttack = null;
  } else {
    clientUIState.selectedSpecialAttack = type;
  }
}

export function clearSiegeAttackMode() {
  clientUIState.selectedSpecialAttack = null;
}
