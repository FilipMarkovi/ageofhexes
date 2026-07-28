import { toggleBuildMode, clearBuildMode } from "../ui/buildMode.js";
import { toggleAbilityMode, clearAbilityMode } from "../ui/abilityMode.js";


export function initKeyboard() {
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;

    if (e.key === "1") toggleBuildMode("FORT");
    if (e.key === "2") toggleBuildMode("BARRACKS");
    if (e.key === "3") toggleBuildMode("HOUSE");
    if (e.key === "4") toggleBuildMode("LABORATORY");
    //if (e.key === "5") toggleBuildMode("SIEGE_OUTPOST")

    if (e.key === "e") toggleAbilityMode("ATTACK_SPEED")
    if (e.key === "r") toggleAbilityMode("ARMY_GAIN_BUFF")

    if (e.key === "Escape") {
      clearBuildMode();
      clearAbilityMode();
    }
  });
}
