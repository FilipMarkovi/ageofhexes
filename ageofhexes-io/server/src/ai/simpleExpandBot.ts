// server/ai/simpleExpandBot.ts

import { CoreGameState, nonOwnedNeighbors, getConnectedTilesFromHQ, neighborTiles,
  hexDistance, key, Intent, canStartCapture, isAdjacentOwnedAndConnected } from "../../../system/index.js";
import { BUILDING_COST, BUILDING_LIMIT, ARMY_CAP_PER_TILE, BASE_ARMY_MAX, HOUSE_ARMY_CAP_BONUS, EFFECT_COSTS, BASE_CAPTURE_COST } from "../../../shared/constants.js";
import { PlayerId, TileState } from "../../../shared/index.js";
import { MIN_HQ_DISTANCE } from "../../../shared/constants.js";

export function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function getValidHQPositions(state: CoreGameState, botId: PlayerId): TileState[] {
  const validTiles: TileState[] = [];

  for (const tile of state.tiles.values()) {
    // 1. Block invalid terrain types and claimed tiles
    if (tile.terrain === "WATER" || tile.terrain === "BEDROCK" || tile.ownerId !== null) {
      continue;
    }

    // 2. Proximity validation check against existing HQs
    let tooClose = false;
    for (const [ownerId, hqTile] of state.HQLocations.entries()) {
      if (ownerId === botId) continue; // Skip checking against self
      
      if (hexDistance({ q: tile.q, r: tile.r }, { q: hqTile.q, r: hqTile.r }) < MIN_HQ_DISTANCE) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      validTiles.push(tile);
    }
  }
  return validTiles;
}

export function bestAI(state: CoreGameState, botId: PlayerId): Intent | null {
  const bot = state.players.get(botId);
  if (!bot || bot.eliminated || bot.status !== "PLAYING") return null;

  // HQ PLACEMENT PHASE
  if (state.phase === "HQ_PLACEMENT") {
    if (state.HQLocations.has(botId)) return null;

    const candidates = getValidHQPositions(state, botId);
    if (candidates.length === 0) return null;

    let bestTile: TileState | null = null;
    let highestScore = -Infinity;

    // Smart AI behavior: Evaluate the quality of surrounding fields
    for (const tile of candidates) {
      let score = 100; // Base score
      const neighbors = neighborTiles(state, tile.q, tile.r);
      
      for (const n of neighbors) {
        if (!n) continue;
        if (n.terrain === "GRASS") score += 15;      // High expansion land value
        if (n.terrain === "DESERT") score += 10;     // Moderate expansion land value
        if (n.terrain === "MOUNTAIN") score += 5;    // Defensive point
        if (n.terrain === "WATER" || n.terrain === "BEDROCK") score -= 20; // Dead zone borders
      }
      
      // Add a slight random variance to keep their starting locations organic
      score += Math.random() * 15;

      if (score > highestScore) {
        highestScore = score;
        bestTile = tile;
      }
    }

    if (bestTile) {
      return { type: "PLACE_HQ", q: bestTile.q, r: bestTile.r };
    }
    return null;
  }

  const hq = bot.hqPos;
  const ownedTiles = [...getConnectedTilesFromHQ(state, botId)];
  if (ownedTiles.length === 0) return null;

  const armyCap = BASE_ARMY_MAX + ownedTiles.length * ARMY_CAP_PER_TILE + (bot.buildings.house ?? 0) * HOUSE_ARMY_CAP_BONUS;
  const armyRatio = bot.army / Math.max(1, armyCap);
  const isDesperate = armyRatio < 0.22;
  const isOptimal = armyRatio >= 0.4 && armyRatio <= 0.6;
  const isCapping = armyRatio > 0.78;

  const barracksCount = bot.buildings.barracks ?? 0;
  const houseCount = bot.buildings.house ?? 0;
  const labCount = bot.buildings.laboratory ?? 0;
  const harborCount = bot.buildings.harbor ?? 0;
  const fortCount = bot.buildings.fort ?? 0;

  const hasCoreEco = barracksCount >= 1 && houseCount >= 1;
  const territory = ownedTiles.length;
  const neutralFocus = territory < 18 || !hasCoreEco;
  const economyFocus = territory < 30 || labCount < 1;

  // Aggression calculation based on territory, economy, and neutral focus
  let aggression = 0;
  if (!neutralFocus) aggression += 0.25;
  if (!economyFocus) aggression += 0.35;
  aggression += Math.min(0.4, Math.max(0, territory - 30) * 0.02);
  aggression = Math.min(1, aggression);

  // Defense logic
  for (const axial of ownedTiles) {
    const tile = state.tiles.get(axial);
    if (!tile || !tile.capture) continue;

    // Defend HQ at all costs
    if (tile.q === hq.q && tile.r === hq.r && tile.capture.by !== botId) {
      return { type: "DEFEND", q: tile.q, r: tile.r };
    }
    
    if (tile.building && !isDesperate && tile.capture.by !== botId) {
      return { type: "DEFEND", q: tile.q, r: tile.r };
    }
  }

  if (barracksCount < BUILDING_LIMIT["BARRACKS"] && bot.gold >= BUILDING_COST["BARRACKS"]) {
    const buildTile = findOwnedBuildTile(state, ownedTiles, botId, hq.q, hq.r, false);
    if (buildTile) return { type: "BUILD", q: buildTile.q, r: buildTile.r, buildingType: "BARRACKS" };
  }

  const lowCapPressure = armyRatio > 0.62 || territory >= 12;
  if (houseCount < BUILDING_LIMIT["HOUSE"] && bot.gold >= BUILDING_COST["HOUSE"] && lowCapPressure) {
    const buildTile = findOwnedBuildTile(state, ownedTiles, botId, hq.q, hq.r, false);
    if (buildTile) return { type: "BUILD", q: buildTile.q, r: buildTile.r, buildingType: "HOUSE" };
  }

  if (labCount < BUILDING_LIMIT["LABORATORY"] && bot.gold >= BUILDING_COST["LABORATORY"] && hasCoreEco && territory >= 14) {
    const buildTile = findOwnedBuildTile(state, ownedTiles, botId, hq.q, hq.r, false);
    if (buildTile) return { type: "BUILD", q: buildTile.q, r: buildTile.r, buildingType: "LABORATORY" };
  }

  if (harborCount < BUILDING_LIMIT["HARBOR"] && bot.gold >= BUILDING_COST["HARBOR"] && territory >= 8) {
    const harborTile = findOwnedBuildTile(state, ownedTiles, botId, hq.q, hq.r, false, true);
    if (harborTile) return { type: "BUILD", q: harborTile.q, r: harborTile.r, buildingType: "HARBOR" };
  }

  if (fortCount < BUILDING_LIMIT["FORT"] && bot.gold >= BUILDING_COST["FORT"] && aggression > 0.2) {
    const buildTile = findOwnedBuildTile(state, ownedTiles, botId, hq.q, hq.r, true);
    if (buildTile) return { type: "BUILD", q: buildTile.q, r: buildTile.r, buildingType: "FORT" };
  }

  //if (bot.gold >= BUILDING_COST["SIEGE_OUTPOST"] && (bot.buildings.siege_outpost || 0) < BUILDING_LIMIT["SIEGE_OUTPOST"] && aggression > 0.5) {
  //  const buildTile = findOwnedBuildTile(state, ownedTiles, botId, hq.q, hq.r, true);
  //  if (buildTile) return { type: "BUILD", q: buildTile.q, r: buildTile.r, buildingType: "SIEGE_OUTPOST" };
  //}

  if (isDesperate) return null;

  if (labCount > 0 && !hasEffect(bot, "ARMY_GAIN_BUFF") && bot.gold >= EFFECT_COSTS.ARMY_GAIN_BUFF && armyRatio < 0.65) {
    return { type: "BUY_PLAYER_EFFECT", effectType: "ARMY_GAIN_BUFF", targetPlayerId: botId };
  }

  if (labCount > 0 && aggression > 0.35 && !hasEffect(bot, "ATTACK_SPEED") && bot.gold >= EFFECT_COSTS.ATTACK_SPEED && armyRatio > 0.45) {
    return { type: "BUY_PLAYER_EFFECT", effectType: "ATTACK_SPEED", targetPlayerId: botId };
  }

  const uniqueTargets = new Map<string, TileState>();
  for (const target of state.tiles.values()) {
    if (target.ownerId === botId || target.capture) continue;
    if (target.terrain === "WATER" || target.terrain === "BEDROCK") continue;
    if (!canStartCapture(state, botId, target.q, target.r)) continue;
    uniqueTargets.set(key(target.q, target.r), target);
  }

  let bestTarget: TileState | null = null;
  let highestScore = -Infinity;

  for (const target of uniqueTargets.values()) {
    const isNeutral = target.ownerId === null;
    const isHQ = target.building === "HQ";
    const isNavalTarget = !isAdjacentOwnedAndConnected(state, target.q, target.r, botId);
    const distFromHQ = hexDistance({ q: hq.q, r: hq.r }, { q: target.q, r: target.r });

    let score = 100;
    score -= target.defense * 3;
    score -= distFromHQ * 1.5;

    if (isNeutral) {
      score += 70;
      if (isNavalTarget) score += 10;
      if (isCapping) score += target.defense * 5;
    } else {
      score += 90;
      if (target.building) score += 60;
      if (isHQ) score += 500;
      if (target.defense < bot.army * 0.35) score += 30;
      if (isNavalTarget) score += 20;
      score *= 0.60 + aggression;
    }

    if (isOptimal && target.defense * BASE_CAPTURE_COST > bot.army * 0.2 && !isHQ) {
      score *= 0.55;
    }

    if (isCapping) score *= 1.8;
    score += Math.random() * 10;

    if (score > highestScore) {
      highestScore = score;
      bestTarget = target;
    }
  }

  if (neutralFocus && bestTarget?.ownerId === null) {
    return { type: "CAPTURE", q: bestTarget.q, r: bestTarget.r };
  }

  if (economyFocus && bestTarget?.ownerId === null && Math.random() < 0.8) {
    return { type: "CAPTURE", q: bestTarget.q, r: bestTarget.r };
  }

  if (bestTarget) {
    return { type: "CAPTURE", q: bestTarget.q, r: bestTarget.r };
  }

  return null;
}

function hasEffect(bot: { effects: Array<{ type: string }> }, effectType: string): boolean {
  return bot.effects.some((e) => e.type === effectType);
}

function findOwnedBuildTile(
  state: CoreGameState,
  ownedTiles: string[],
  botId: PlayerId,
  hqQ: number,
  hqR: number,
  preferBorder = false,
  requireWaterAdjacency = false
): TileState | null {
  let best: TileState | null = null;
  let bestScore = -Infinity;

  for (const axial of ownedTiles) {
    const tile = state.tiles.get(axial);
    if (!tile || tile.ownerId !== botId || tile.building || tile.buildingAction) continue;

    const borderPressure = nonOwnedNeighbors(state, tile.q, tile.r, botId).length;
    if (preferBorder && borderPressure === 0) continue;

    if (requireWaterAdjacency) {
      const adjacentTiles = neighborTiles(state, tile.q, tile.r);
      const hasWater = adjacentTiles.some((neighbor: TileState | null) => neighbor?.terrain === "WATER");
      if (!hasWater) continue;
    }

    const dist = hexDistance({ q: hqQ, r: hqR }, { q: tile.q, r: tile.r });
    let score = 100;
    score -= dist * 2;
    score += borderPressure * (preferBorder ? 18 : 6);
    if (requireWaterAdjacency) score += 20;

    if (score > bestScore) {
      bestScore = score;
      best = tile;
    }
  }

  return best;
}

