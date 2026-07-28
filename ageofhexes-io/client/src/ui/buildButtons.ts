import type { CoreGameState, PlayerId, BuildingType, PlayerEffectType } from "../../../shared/index.js";
import { BUILDING_COST, BUILDING_LIMIT, DEMOLISH_REFUND_RATIO, EFFECT_COSTS, EFFECT_DURATIONS } from "../../../shared/constants.js";
import { clientUIState } from "../state/clientState.js";
import { toggleBuildMode } from "./buildMode.js";
import { toggleAbilityMode } from "./abilityMode.js";

type BtnDef = {
  type: BuildingType;
  key: string;
  label: string;
  cost: number;
  limit: number;
  description: string;
};

const defs: BtnDef[] = [
  { type: "FORT", key: "1", label: `Fort`, cost: BUILDING_COST["FORT"], limit: BUILDING_LIMIT["FORT"], description: "Increases defense of nearby tiles." },
  { type: "BARRACKS", key: "2", label: "Barracks", cost: BUILDING_COST["BARRACKS"], limit: BUILDING_LIMIT["BARRACKS"], description: "Increases production rate of army." },
  { type: "HOUSE", key: "3", label: "House", cost: BUILDING_COST["HOUSE"], limit: BUILDING_LIMIT["HOUSE"], description: "Increases maximum population size." },
  { type: "LABORATORY", key: "4", label: "Laboratory", cost: BUILDING_COST["LABORATORY"], limit: BUILDING_LIMIT["LABORATORY"], description: "Unlocks ability to buy buffs and debuffs." },
  //{ type: "SIEGE_OUTPOST", key: "5", label: "Siege Outpost", cost: BUILDING_COST["SIEGE_OUTPOST"], limit: BUILDING_LIMIT["SIEGE_OUTPOST"], description: "Offense oriented building that grants the ability to use special attacks within its range." },
];

type ResearchDef = {
  type: PlayerEffectType;
  key: string;
  label: string;
  cost: number;
  description: string;
  isBuff: boolean;
};

const researchDefs: ResearchDef[] = [
  { 
    type: "ATTACK_SPEED", 
    key: "E", 
    label: "Stardust Catalyst", 
    cost: EFFECT_COSTS["ATTACK_SPEED"],
    description: "Instantly injects an adrenaline buff boosting tile capture speeds by 50%.",
    isBuff: true
  },
  {
    type: "ARMY_GAIN_BUFF", 
    key: "R",
    label: "Overclock Protocol",
    cost: EFFECT_COSTS["ARMY_GAIN_BUFF"],
    description: `Boost army production by 2x for ${EFFECT_DURATIONS["ARMY_GAIN_BUFF"] / 2000}s, followed by an immediate 0.5x burnout crash for ${EFFECT_DURATIONS["ARMY_GAIN_BUFF"] / 2000}s.`,
    isBuff: true
  }
];

const btnByType = new Map<BuildingType, HTMLButtonElement>();
const researchBtnByType = new Map<string, HTMLButtonElement>();

export function initBuildButtons() {
  // MAIN BUILDING CONTAINER (Bottom Row)
  const container = document.createElement("div");
  container.id = "build-ui";
  container.style.position = "absolute";
  container.style.bottom = "16px";
  container.style.left = "16px";
  container.style.display = "flex";
  container.style.gap = "10px";
  container.style.zIndex = "10";
  document.body.appendChild(container);

  // RESEARCH/ABILITY CONTAINER
  const researchContainer = document.createElement("div");
  researchContainer.id = "research-ui";
  researchContainer.style.position = "absolute";
  researchContainer.style.bottom = "60px";
  researchContainer.style.left = "16px";
  researchContainer.style.display = "flex";
  researchContainer.style.gap = "10px";
  researchContainer.style.zIndex = "10";
  document.body.appendChild(researchContainer);

  // TOOLTIP STRUCTURE
  const tooltip = document.createElement("div");
  tooltip.id = "build-tooltip";
  Object.assign(tooltip.style, {
    position: "absolute",
    bottom: "108px", 
    left: "16px",
    background: "rgba(10, 15, 30, 0.95)",
    color: "white",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    maxWidth: "220px",
    pointerEvents: "none",
    display: "none",
    zIndex: "100",
    border: "1px solid rgba(147, 51, 234, 0.3)"
  });
  document.body.appendChild(tooltip);

  // --- GENERATE CONVENTIONAL BUILD BUTTONS ---
  for (const d of defs) {
    const btn = document.createElement("button");
    btn.textContent = `[${d.key}] ${d.label} (${d.cost})`;
    btn.style.padding = "8px 10px";
    btn.style.borderRadius = "8px";
    btn.style.border = "1px solid rgba(255,255,255,0.2)";
    btn.style.background = "rgba(0,0,0,0.55)";
    btn.style.color = "white";
    btn.style.cursor = "pointer";

    btn.onclick = () => toggleBuildMode(d.type);

    btn.onmouseenter = () => {
      tooltip.innerHTML = `
        <div style="font-weight: bold; color: #facc15; margin-bottom: 4px;">${d.label}</div>
        <div style="opacity: 0.9; line-height: 1.4; margin-bottom: 4px;">${d.description}</div>
        <div style="opacity: 0.7; font-size: 11px;">Cost: ${d.cost} gold | Refund: ${d.cost * DEMOLISH_REFUND_RATIO}g</div>
      `;
      tooltip.style.display = "block";
      tooltip.style.left = `${btn.getBoundingClientRect().left}px`;
    };

    btn.onmouseleave = () => tooltip.style.display = "none";

    container.appendChild(btn);
    btnByType.set(d.type, btn);
  }

  // --- GENERATE LABORATORY UPGRADE BUTTONS ---
for (const r of researchDefs) {
    const btn = document.createElement("button");
    btn.textContent = `[${r.key}] ${r.label} (${r.cost})`;
    btn.style.padding = "6px 12px";
    btn.style.borderRadius = "8px";
    btn.style.border = "1px solid rgba(168, 85, 247, 0.4)";
    btn.style.background = "rgba(88, 28, 135, 0.4)";
    btn.style.color = "#e9d5ff";
    btn.style.fontWeight = "600";
    btn.style.fontSize = "13px";

    btn.onclick = () => {
      if (btn.disabled) return;
      toggleAbilityMode(r.type);
    };

    btn.onmouseenter = () => {
      const durationMs = EFFECT_DURATIONS[r.type] ?? 0;
      const durationText = durationMs > 0 ? `${durationMs / 1000}s` : "Permanent";

      tooltip.innerHTML = `
        <div style="font-weight: bold; color: #c084fc; margin-bottom: 4px;">🧪 RESEARCH: ${r.label}</div>
        <div style="opacity: 0.9; line-height: 1.4; margin-bottom: 6px;">${r.description}</div>
        <div style="display: flex; gap: 12px; font-size: 11px;">
          <div style="color: #facc15; font-weight: 500;">Cost: ${r.cost} gold</div>
          <div style="color: #a7f3d0; font-weight: 500;">Duration: ${durationText}</div>
        </div>
      `;
      tooltip.style.display = "block";
      tooltip.style.left = `${btn.getBoundingClientRect().left}px`;
    };

    btn.onmouseleave = () => tooltip.style.display = "none";

    researchContainer.appendChild(btn);
    researchBtnByType.set(r.type, btn);
  }
}

export function updateBuildButtons(state: CoreGameState | null, me: PlayerId | null, myPlannedBuildingCounts: Record<string, number>) {
  const container = document.getElementById("build-ui");
  const researchContainer = document.getElementById("research-ui");
  if (!container || !researchContainer) return;

  if (clientUIState.phase !== "PLAYING") {
    container.style.display = "none";
    researchContainer.style.display = "none";
    return;
  }

  container.style.display = "flex";

  if (!state || !me) return;
  const p = state.players.get(me);
  if (!p) return;

  const hasLaboratory = (p.buildings.laboratory ?? 0) > 0;
  researchContainer.style.display = hasLaboratory ? "flex" : "none";

  // --- UPDATE BUILD BUTTONS LOGIC ---
for (const d of defs) {
    const btn = btnByType.get(d.type);
    if (!btn) continue;

    const buildingKey = d.type.toLowerCase();
    
    // FETCH CACHED COUNTS: Completed + Under Construction
    const plannedCount = myPlannedBuildingCounts[buildingKey] ?? 0;
    
    // raw value only for text string rendering displays
    const currentCount = p.buildings[buildingKey as keyof typeof p.buildings] ?? 0;

    const affordable = p.gold >= d.cost;
    const selected = clientUIState.selectedBuilding === d.type;
    
    // FIX: Base button validation limits entirely on total footprints!
    const disable = (!affordable || (plannedCount >= d.limit));

    btn.disabled = disable;
    // UI text remains clean, showing your true active structures
    btn.textContent = `[${d.key}] ` + d.label + ` (${currentCount}/${d.limit})`;
    btn.style.opacity = !disable ? "1" : "0.35";
    btn.style.cursor = !disable ? "pointer" : "not-allowed";
    btn.style.outline = selected ? "2px solid rgba(107,124,255,0.9)" : "none";
  }

  // --- UPDATE LABORATORY ACTION BUTTONS TICK STATE ---
  for (const r of researchDefs) {
    const btn = researchBtnByType.get(r.type);
    if (!btn) continue;

    const canAfford = p.gold >= r.cost;
    const isLockedOut = !canAfford || !hasLaboratory;
    const isSelected = clientUIState.selectedAbility === r.type;

    btn.disabled = isLockedOut;
    
    const activeBuff = p.effects?.find(e => e.type === r.type);
    if (activeBuff && activeBuff.durationLeft !== null) {
      btn.textContent = `ACTIVE (${Math.ceil(activeBuff.durationLeft / 1000)}s)`;
      btn.style.background = r.isBuff ? "rgba(22, 163, 74, 0.5)" : "rgba(220, 38, 38, 0.5)"; 
      btn.style.borderColor = r.isBuff ? "#22c55e" : "#ef4444";
    } else {
      btn.textContent = `[${r.key}] ${r.label}`;
      btn.style.background = isLockedOut ? "rgba(30, 20, 40, 0.4)" : "rgba(88, 28, 135, 0.4)";
      btn.style.borderColor = isLockedOut ? "rgba(255,255,255,0.1)" : "rgba(168, 85, 247, 0.6)";
    }

    btn.style.opacity = isLockedOut ? "0.4" : "1";
    btn.style.cursor = isLockedOut ? "not-allowed" : "pointer";
    
    // Highlights purple when ability selection mode is loaded onto the player's cursor
    btn.style.outline = isSelected ? "2px solid rgba(168, 85, 247, 0.9)" : "none";
  }
}