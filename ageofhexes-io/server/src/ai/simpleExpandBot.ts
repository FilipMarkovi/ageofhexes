// server/ai/simpleExpandBot.ts

import { CoreGameState, nonOwnedNeighbors, getConnectedTilesFromHQ, neighborTiles, getTile,
  hexDistance, key, Intent, canStartCapture } from "../../../system/index.js";
import { BUILDING_COST, BUILDING_LIMIT, ARMY_CAP_PER_TILE, BASE_ARMY_MAX, HOUSE_ARMY_CAP_BONUS } from "../../../shared/constants.js";
import { PIVOT_DIST, STEEPNESS } from "../../../system/core/serverConstants.js";
import { PlayerId, TileState } from "../../../shared/index.js";

export function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function getValidHQPositions(state: CoreGameState, botId: PlayerId): TileState[] {
  const validTiles: TileState[] = [];
  const MIN_HQ_DISTANCE = 2; // Must be at least 2 tiles away from enemy spawn locations

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

export function smartAI(state: CoreGameState, botId: PlayerId): Intent | null {
  const bot = state.players.get(botId);
  if (!bot || bot.eliminated || bot.status !== "PLAYING") return null;

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

  // ---------------------------------------------------------
  // 1. MACRO ECONOMY CHECK (The 50% Army Sweet Spot)
  // ---------------------------------------------------------
  // Assuming you have a way to calculate max army. If not, replace with your calculation.
  const maxArmy = (BASE_ARMY_MAX + (ownedTiles.length * ARMY_CAP_PER_TILE) + (bot.buildings.house ?? 0) * HOUSE_ARMY_CAP_BONUS); 
  const armyRatio = bot.army / maxArmy;

  const isDesperate = armyRatio < 0.2;  // Too weak, need to save troops
  const isOptimal = armyRatio >= 0.4 && armyRatio <= 0.6; // Perfect regen zone
  const isCapping = armyRatio > 0.75; // Army too high, wasting regen - MUST ATTACK

  // ---------------------------------------------------------
  // 2. IMMEDIATE THREAT RESPONSE (Defend)
  // ---------------------------------------------------------
  for (const axial of ownedTiles) {
    const tile = state.tiles.get(axial);
    if (!tile || !tile.capture) continue;

    // Defend HQ at all costs
    if (tile.q === hq.q && tile.r === hq.r && tile.capture.by !== botId) {
      return { type: "DEFEND", q: tile.q, r: tile.r };
    }
    
    // Defend Barracks/Forts if we have decent army
    if (tile.building && !isDesperate && tile.capture.by !== botId) {
      return { type: "DEFEND", q: tile.q, r: tile.r };
    }
  }

  // ---------------------------------------------------------
  // 3. INFRASTRUCTURE & BUILDINGS
  // ---------------------------------------------------------
  // Build Barracks to boost production (prefer safe tiles near HQ)
  if (bot.gold >= BUILDING_COST["BARRACKS"] && (bot.buildings.barracks || 0) < BUILDING_LIMIT["BARRACKS"]) {
    const hqNeighbors = neighborTiles(state, hq.q, hq.r);
    for (const tile of hqNeighbors) {
      if (tile && tile.ownerId === botId && !tile.building) {
        return { type: "BUILD", q: tile.q, r: tile.r, buildingType: "BARRACKS" };
      }
    }
  }

  // Build Forts on borders if we are rich but getting attacked
  if (bot.gold >= BUILDING_COST["FORT"] && (bot.buildings.fort || 0) < BUILDING_LIMIT["FORT"]) {
    // Find a border tile (owned tile with non-owned neighbors)
    for (const axial of ownedTiles) {
      const tile = state.tiles.get(axial)
      if(!tile) continue
      const neighbors = nonOwnedNeighbors(state, tile.q, tile.r, botId);
      if (neighbors.length > 0) {
        const tile = state.tiles.get(axial);
        if (tile && !tile.building) {
          return { type: "BUILD", q: tile.q, r: tile.r, buildingType: "FORT" };
        }
      }
    }
  }

  // If our army is dangerously low, do nothing and let it regenerate to 50%
  if (isDesperate) return null;

  // ---------------------------------------------------------
  // 4. STRATEGIC TARGET SELECTION (Utility Scoring)
  // ---------------------------------------------------------
  let bestTarget: TileState | null = null;
  let highestScore = -Infinity;

  const uniqueTargets = new Map<string, TileState>();

  // Gather all possible targets along the border
  for (const axial of ownedTiles) {
    const coords = axial.split(',');
    const q = parseInt(coords[0]);
    const r = parseInt(coords[1]);
    
    const neighbors = nonOwnedNeighbors(state, q, r, botId);
    for (const n of neighbors) {
      const target = getTile(state, n.q, n.r);
      if (target && !target.capture) {
        uniqueTargets.set(key(target.q, target.r), target);
      }
    }
  }

  // Score each target
  for (const target of uniqueTargets.values()) {
    if (!canStartCapture(state, botId, target.q, target.r)) continue;

    let score = 100; // Base score
    const isNeutral = !target.ownerId;
    
    // A. Economy & Expansion (Neutral Farming)
    if (isNeutral) {
      score += 50; // Good for gold
      score -= target.defense * 3; // Prefer cheaper neutral tiles
      
      // If our army is getting too high, we actually WANT to hit harder tiles to burn troops
      if (isCapping) score += target.defense * 5; 
    }

    // B. Aggression (Attacking Players)
    if (!isNeutral) {
      score += 80; // Incentive to hurt players
      
      // MASSIVE priority for enemy HQs
      if (target.building === "HQ") {
        score += 5000; 
      }
      
      // Target weak spots in enemy armor
      if (target.defense < bot.army * 0.3) {
        score += 100; 
      }
    }

    // C. Distance / Border Cohesion
    const distFromHQ = hexDistance({ q: hq.q, r: hq.r }, { q: target.q, r: target.r });
    score -= (distFromHQ * 2); // Prefer staying somewhat compact

    // D. Aggression Modifiers based on 50% Sweet Spot
    if (isCapping) {
      // Must spend troops so we don't waste regen. Be highly aggressive.
      score *= 2.0; 
    } else if (isOptimal) {
      // We are in the sweet spot. Only take high-value or cheap targets.
      if (target.defense > bot.army * 0.2 && target.building !== "HQ") {
         score *= 0.3; // De-prioritize expensive tiles unless it's an HQ
      }
    }

    // Add slight randomness to prevent bots from getting stuck in loops
    score += Math.random() * 20;

    if (score > highestScore) {
      highestScore = score;
      bestTarget = target;
    }
  }

  // Execute the best move
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
  preferBorder = false
): TileState | null {
  let best: TileState | null = null;
  let bestScore = -Infinity;

  for (const axial of ownedTiles) {
    const tile = state.tiles.get(axial);
    if (!tile || tile.ownerId !== botId || tile.building || tile.buildingAction) continue;

    const borderPressure = nonOwnedNeighbors(state, tile.q, tile.r, botId).length;
    if (preferBorder && borderPressure === 0) continue;

    const dist = hexDistance({ q: hqQ, r: hqR }, { q: tile.q, r: tile.r });
    let score = 100;
    score -= dist * 2;
    score += borderPressure * (preferBorder ? 18 : 6);

    if (score > bestScore) {
      bestScore = score;
      best = tile;
    }
  }

  return best;
}

export function deadlyAI(state: CoreGameState, botId: PlayerId): Intent | null {
  const bot = state.players.get(botId);
  if (!bot || bot.eliminated || bot.status !== "PLAYING") return null;

  if (state.phase === "HQ_PLACEMENT") {
    if (state.HQLocations.has(botId)) return null;

    const candidates = getValidHQPositions(state, botId);
    if (candidates.length === 0) return null;

    let bestTile: TileState | null = null;
    let bestScore = -Infinity;

    for (const tile of candidates) {
      let score = 100;
      const neighbors = neighborTiles(state, tile.q, tile.r);

      for (const n of neighbors) {
        if (!n) continue;
        if (n.terrain === "GRASS") score += 18;
        if (n.terrain === "DESERT") score += 10;
        if (n.terrain === "MOUNTAIN") score += 5;
        if (n.terrain === "WATER" || n.terrain === "BEDROCK") score -= 22;
      }

      score += Math.random() * 10;
      if (score > bestScore) {
        bestScore = score;
        bestTile = tile;
      }
    }

    if (bestTile) return { type: "PLACE_HQ", q: bestTile.q, r: bestTile.r };
    return null;
  }

  const ownedTiles = [...getConnectedTilesFromHQ(state, botId)];
  if (ownedTiles.length === 0) return null;

  const hq = bot.hqPos;
  const armyCap = BASE_ARMY_MAX + ownedTiles.length * ARMY_CAP_PER_TILE + (bot.buildings.house ?? 0) * HOUSE_ARMY_CAP_BONUS;
  const armyRatio = bot.army / Math.max(1, armyCap);
  const isDesperate = armyRatio < 0.22;
  const isCapping = armyRatio > 0.78;

  const barracksCount = bot.buildings.barracks ?? 0;
  const houseCount = bot.buildings.house ?? 0;
  const labCount = bot.buildings.laboratory ?? 0;

  const hasCoreEco = barracksCount >= 1 && houseCount >= 1;
  const territory = ownedTiles.length;

  const earlyTarget = 18;
  const midTarget = 30;

  const neutralFocus = territory < earlyTarget || !hasCoreEco;
  const economyFocus = territory < midTarget || labCount < 1;

  let aggression = 0;
  if (!neutralFocus) aggression += 0.25;
  if (!economyFocus) aggression += 0.35;
  aggression += Math.min(0.4, Math.max(0, territory - midTarget) * 0.02);
  aggression = Math.min(1, aggression);

  for (const axial of ownedTiles) {
    const tile = state.tiles.get(axial);
    if (!tile || !tile.capture) continue;

    if (tile.q === hq.q && tile.r === hq.r && tile.capture.by !== botId) {
      return { type: "DEFEND", q: tile.q, r: tile.r };
    }

    if (tile.building && tile.capture.by !== botId && armyRatio > 0.3) {
      return { type: "DEFEND", q: tile.q, r: tile.r };
    }
  }

  if (barracksCount < BUILDING_LIMIT["BARRACKS"] && bot.gold >= BUILDING_COST["BARRACKS"]) {
    const buildTile = findOwnedBuildTile(state, ownedTiles, botId, hq.q, hq.r, false);
    if (buildTile) {
      return { type: "BUILD", q: buildTile.q, r: buildTile.r, buildingType: "BARRACKS" };
    }
  }

  const lowCapPressure = armyRatio > 0.62 || territory >= 12;
  if (houseCount < BUILDING_LIMIT["HOUSE"] && bot.gold >= BUILDING_COST["HOUSE"] && lowCapPressure) {
    const buildTile = findOwnedBuildTile(state, ownedTiles, botId, hq.q, hq.r, false);
    if (buildTile) {
      return { type: "BUILD", q: buildTile.q, r: buildTile.r, buildingType: "HOUSE" };
    }
  }

  const shouldTech = hasCoreEco && territory >= 14;
  if (labCount < BUILDING_LIMIT["LABORATORY"] && bot.gold >= BUILDING_COST["LABORATORY"] && shouldTech) {
    const buildTile = findOwnedBuildTile(state, ownedTiles, botId, hq.q, hq.r, false);
    if (buildTile) {
      return { type: "BUILD", q: buildTile.q, r: buildTile.r, buildingType: "LABORATORY" };
    }
  }

  if (labCount > 0 && !hasEffect(bot, "ARMY_GAIN_BUFF") && bot.gold >= 40 && armyRatio < 0.65) {
    return { type: "BUY_PLAYER_EFFECT", effectType: "ARMY_GAIN_BUFF", targetPlayerId: botId };
  }

  if (labCount > 0 && aggression > 0.35 && !hasEffect(bot, "ATTACK_SPEED") && bot.gold >= 30 && armyRatio > 0.45) {
    return { type: "BUY_PLAYER_EFFECT", effectType: "ATTACK_SPEED", targetPlayerId: botId };
  }

  if ((bot.buildings.fort ?? 0) < BUILDING_LIMIT["FORT"] && bot.gold >= BUILDING_COST["FORT"] && aggression > 0.2) {
    const buildTile = findOwnedBuildTile(state, ownedTiles, botId, hq.q, hq.r, true);
    if (buildTile) {
      return { type: "BUILD", q: buildTile.q, r: buildTile.r, buildingType: "FORT" };
    }
  }

  if (isDesperate) return null;

  const candidates = new Map<string, TileState>();
  for (const axial of ownedTiles) {
    const [qStr, rStr] = axial.split(",");
    const q = Number(qStr);
    const r = Number(rStr);
    const neighbors = nonOwnedNeighbors(state, q, r, botId);

    for (const n of neighbors) {
      const target = getTile(state, n.q, n.r);
      if (!target || target.capture) continue;
      if (!canStartCapture(state, botId, target.q, target.r)) continue;
      candidates.set(key(target.q, target.r), target);
    }
  }

  if (candidates.size === 0) return null;

  let bestNeutral: TileState | null = null;
  let bestNeutralScore = -Infinity;
  let bestEnemy: TileState | null = null;
  let bestEnemyScore = -Infinity;

  for (const target of candidates.values()) {
    const dist = hexDistance({ q: hq.q, r: hq.r }, { q: target.q, r: target.r });
    const isNeutral = target.ownerId === null;
    const isHQ = target.building === "HQ";

    let score = 100;
    score -= target.defense * 3;
    score -= dist * 1.5;
    if (isCapping) score += target.defense * 4;
    score += Math.random() * 8;

    if (isNeutral) {
      score += 80;
      if (score > bestNeutralScore) {
        bestNeutralScore = score;
        bestNeutral = target;
      }
      continue;
    }

    score += 40;
    if (target.building) score += 80;
    if (isHQ) score += 1000;
    if (target.defense < bot.army * 0.35) score += 110;
    score *= (0.65 + aggression);

    if (score > bestEnemyScore) {
      bestEnemyScore = score;
      bestEnemy = target;
    }
  }

  if (neutralFocus && bestNeutral) {
    return { type: "CAPTURE", q: bestNeutral.q, r: bestNeutral.r };
  }

  if (economyFocus && bestNeutral && Math.random() < 0.8) {
    return { type: "CAPTURE", q: bestNeutral.q, r: bestNeutral.r };
  }

  if (bestEnemy && aggression > 0.2) {
    return { type: "CAPTURE", q: bestEnemy.q, r: bestEnemy.r };
  }

  if (bestNeutral) {
    return { type: "CAPTURE", q: bestNeutral.q, r: bestNeutral.r };
  }

  if (bestEnemy) {
    return { type: "CAPTURE", q: bestEnemy.q, r: bestEnemy.r };
  }

  return null;
}