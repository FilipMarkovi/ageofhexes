
import type { PlayerId, TileState, BuildingType, TileEffectType, TileEffect, PlayerState,
  PlayerEffectType, PlayerEffect } from "../../shared/index.js";
import { calculateCaptureRate } from "../../shared/util.js";
import { BASE_CAPTURE_COST, FORT_DEFENSE_ADJACENT, FORT_DEFENSE_SELF,
  HQ_DEFENSE_ADJACENT, HQ_DEFENSE_SELF, GOLD_PER_TILE, BASE_ARMY_MAX, BASE_GOLD_MAX, ARMY_CAP_PER_TILE, CAPTURE_RATE,
  GOLD_PASSIVE, ARMY_PASSIVE, BARRACKS_ARMY_BONUS, DEFEND_COST_RATIO, BUILDING_COST,
  DEMOLISH_REFUND_RATIO, GOLD_PEAK, ARMY_PEAK,  DEFENSE_HEAT_MAX, DEFENSE_HEAT_DECAY_MS,
  DEFENSE_COST_INCREMENT, TILE_ATTACK_COOLDOWN, BUILDING_LIMIT, HOUSE_ARMY_CAP_BONUS, ARMY_PER_TILE,
  TILES_UNTIL_MAX_ATTACKTIME_INCREASE, MAX_ATTACKTIME_INCREASE, NEUTRAL_TILE_CAPTURE_GOLD,
  PLAYER_KILL_GOLD_REWARD, EFFECT_DURATIONS, EFFECT_STRENGTHS, EFFECT_COSTS, BUILDING_CONSTRUCTION_TIME,
  BUILDING_DEMOLISH_TIME} from "../../shared/constants.js";
import type { CoreGameState } from "./state.js";
import { handlePlaceHQ } from "./state.js";
import { getTile, isAdjacentOwned, key, neighbors, isAdjacentOwnedAndConnected } from "./state.js";
import { sendPlayerLog, updatePlayerStat } from "../../server/src/index.js";

export type Intent =
  | { type: "PLACE_HQ"; q: number; r: number }
  | { type: "CAPTURE"; q: number; r: number }
  | { type: "BUILD"; q: number; r: number; buildingType: string }
  | { type: "DEMOLISH"; q: number; r: number }
  | { type: "DEFEND"; q: number; r: number }
  | { type: "JOIN_QUEUE"; username: string }
  | { type: "RETURN_LOBBY" }
  | { type: "PING" }
  | { type: "BUY_PLAYER_EFFECT"; effectType: PlayerEffectType; targetPlayerId: PlayerId }
  | null;

const VALID_BUILDINGS = new Set<string>(Object.keys(BUILDING_COST));
const VALID_EFFECTS = new Set<string>(Object.keys(EFFECT_COSTS));

export function captureCost(defense: number) {
  return BASE_CAPTURE_COST * defense;
}

function applyAdjacencyBonus(
  state: CoreGameState,
  tile: TileState,
  selfBonus: number,
  adjacentBonus: number
) {
  tile.defense += selfBonus;

  for (const n of neighbors(tile.q, tile.r)) {
    const t = getTile(state, n.q, n.r);
    if (t && t.ownerId === tile.ownerId) {
      t.defense += adjacentBonus;
    }
  }
}

export function recalcDefense(state: CoreGameState) {
  // PASS 1: reset to immutable base
  for (const tile of state.tiles.values()) {
    tile.defense = tile.baseDefense;
  }

  // PASS 2: apply owned-tile modifiers
  for (const tile of state.tiles.values()) {
    const owner = tile.ownerId;
    if (!owner) continue;

    if (tile.building === "FORT") {
      applyAdjacencyBonus(
        state,
        tile,
        FORT_DEFENSE_SELF,
        FORT_DEFENSE_ADJACENT
      );
    }

    if (tile.building === "HQ") {
      applyAdjacencyBonus(
        state,
        tile,
        HQ_DEFENSE_SELF,
        HQ_DEFENSE_ADJACENT
      );
    }

  }
}

export function placeHQ(state: CoreGameState, q: number, r: number, playerId: PlayerId) {
  const tile = getTile(state, q, r);
  if (!tile) throw new Error("Cannot place HQ on invalid tile");
  tile.ownerId = playerId;
  tile.building = "HQ";
  recalcDefense(state);
}

export function canStartCapture(state: CoreGameState, playerId: PlayerId, q: number, r: number) {
  const tile = getTile(state, q, r);
  const player = state.players.get(playerId);
  if (!tile || !player) return false;
  if (tile.ownerId === playerId) return false;
  if (!isAdjacentOwnedAndConnected(state, q, r, playerId)) return false;
  if (tile.terrain === "BEDROCK") return false;
  const cost = captureCost(tile.defense);
  if(Date.now() - tile.lastDefendedAt < TILE_ATTACK_COOLDOWN) return false
  return player.army >= cost;
}

export function canContinueCapture(state: CoreGameState, playerId: PlayerId, q: number, r: number) {
  const tile = getTile(state, q, r);
  const player = state.players.get(playerId);
  if (!tile || !player) return false;
  if (tile.ownerId === playerId) return false;
  // still must keep adjacency + supply while capturing
  if (!isAdjacentOwnedAndConnected(state, q, r, playerId)) return false;
  if (tile.terrain === "BEDROCK") return false;
  return true;
}

export function tryCapture(
  state: CoreGameState,
  playerId: PlayerId,
  q: number,
  r: number
) {
  const tile = getTile(state, q, r);
  const player = state.players.get(playerId);
  if (!tile || !player) return false; //

  if (tile.ownerId === playerId) return false; // 
  if (!isAdjacentOwnedAndConnected(state, q, r, playerId)) return false; // 
  if (tile.terrain === "BEDROCK") return false;

  // Already being captured by same player → ignore . what if another player
  if (tile.capture && tile.capture.by !== playerId) {
    return false;
  }

  if (tile.capture && tile.capture.by === playerId) return true;

  const cost = captureCost(tile.defense);
  if (player.army < cost) return false;

  // Pay upfront
  modifyPlayerResources(state, player, 'army', -cost);

  // Compute capture rate using corrected formula
  const defenderTerritorySize = tile.ownerId 
    ? (state.connectedCache?.get(tile.ownerId)?.size ?? 0) 
    : 0;

  const attackingPlayer = state.players.get(playerId);
  const SPEED_BOOST = hasPlayerEffect(attackingPlayer, "ATTACK_SPEED") 
    ? EFFECT_STRENGTHS["ATTACK_SPEED"] 
    : 1;

  const rate = calculateCaptureRate(tile.defense, defenderTerritorySize, SPEED_BOOST);
  const durationMs = rate > 0 ? (1000 / rate) : Infinity;

  tile.capture = {
    by: playerId,
    remaining: 1, // fraction of work left (1 = 100%)
    cost,
    completeAt: Date.now() + durationMs
  };

  return true;
}

export function tryDefend(state: CoreGameState, playerId: PlayerId, q: number, r: number) {
  const tile = getTile(state, q, r);
  const player = state.players.get(playerId);
  if (!tile || !player) return false;

  if (!tile.capture) return false;                 
  if (tile.ownerId !== playerId) return false;    
  if (!isTileConnectedToHQ(state, playerId, q, r)) return false;
  
  const heatCostIncrease = tile.defenseHeat * DEFENSE_COST_INCREMENT

  const cost = Math.ceil(tile.capture.cost * (DEFEND_COST_RATIO + heatCostIncrease)) ;
  if (player.army < cost) return false;

  modifyPlayerResources(state, player, 'army', -cost);
  tile.capture = null; // cancel capture

  tile.defenseHeat = Math.min(tile.defenseHeat + 1, DEFENSE_HEAT_MAX); 
  tile.lastDefendedAt = Date.now();
  return true;
}

export function tryBuild(
  state: CoreGameState,
  playerId: PlayerId,
  q: number,
  r: number,
  buildingType: BuildingType,
) {
  const tile = getTile(state, q, r);
  const player = state.players.get(playerId);
  if (!tile || !player) return false;
  if (tile.ownerId !== playerId) return false;
  if (tile.building !== null || tile.buildingAction !== null) return false;
  if (player.gold < BUILDING_COST[buildingType]) return false;
  if (!isTileConnectedToHQ(state, playerId, q, r)) return false;
  if(buildingType == "SIEGE_OUTPOST") return false; // TEMPORARY DISABLE ATTACK BUILDINGS
  const bKey = buildingType.toLowerCase() as keyof typeof player.buildings;

  let constructingCount = 0;
  for (const t of state.tiles.values()) {
    if (
      t.ownerId === playerId &&
      t.buildingAction?.actionType === "CONSTRUCTING" &&
      t.buildingAction?.building === buildingType
    ) {
      constructingCount++;
    }
  }
  if(player.buildings[bKey] + constructingCount >= BUILDING_LIMIT[buildingType]) return false

  modifyPlayerResources(state, player, 'gold', -BUILDING_COST[buildingType]);

  const durationMs = BUILDING_CONSTRUCTION_TIME[buildingType] * 1000; // in ms
  tile.buildingAction = {
    building: buildingType,
    actionType: "CONSTRUCTING",
    readyAt: Date.now() + durationMs
  };

  return true;
}

export function tick(state: CoreGameState, dt: number) {
  if (state.phase === "HQ_PLACEMENT") return;

  dt = Math.min(dt, 0.25);
  const now = Date.now()

  state.connectedCache = new Map();
  for (const p of state.players.values()) {
    if (!p.eliminated && p.status === "PLAYING") {
      state.connectedCache.set(
        p.id,
        computeConnectedTilesFromHQ(state, p.id)
      );
      if(p.effects && p.effects.length > 0){
        for (let i = p.effects.length - 1; i >= 0; i--) {
          const effect = p.effects[i];
          if (effect.durationLeft !== null){
            effect.durationLeft -= dt * 1000;
            if (effect.durationLeft <= 0){
              p.effects.splice(i, 1);
            }
          }
        }
      }
    }
  }

  // Count connected tiles + barracks
  const ownedCount = new Map<PlayerId, number>();

  for (const t of state.tiles.values()) {

    // ==== TILE EFFECTS ====
    if (t.effects && t.effects.length > 0) {
      for (let i = t.effects.length - 1; i >= 0; i--) {
        const effect = t.effects[i];
        if (effect.durationLeft !== null){
          effect.durationLeft -= dt * 1000;
          
          if (effect.durationLeft <= 0) {
            t.effects.splice(i, 1);
            recalcDefense(state);
          }
        }
      }
      
    }

    if (t.capture) {
      const by = t.capture.by;

      // If capture conditions no longer valid → cancel
      if (!canContinueCapture(state, by, t.q, t.r)) {
        t.capture = null;
        continue;
      }

      // capture progress (big territory = more time to capture)
      // Use the defending player's connected tiles for territory size
      const defenderTerritorySize = t.ownerId 
        ? (state.connectedCache?.get(t.ownerId)?.size ?? 0) 
        : 0;
      const attackingPlayer = state.players.get(by!);
      const SPEED_BOOST = hasPlayerEffect(attackingPlayer, "ATTACK_SPEED") ? EFFECT_STRENGTHS["ATTACK_SPEED"] : 1;

      // Calculate progress rate using corrected formula
      const rate = calculateCaptureRate(t.defense, defenderTerritorySize, SPEED_BOOST);

      const dec = rate * dt;
      t.capture.remaining = Math.max(0, (t.capture.remaining ?? 1) - dec);

      // Update estimated completion timestamp (for persistence/clients)
      t.capture.completeAt = t.capture.remaining > 0 ? Date.now() + (t.capture.remaining / Math.max(rate, 1e-6)) * 1000 : Date.now();

      if ((t.capture.remaining ?? 1) <= 0) {
        // === FINISH CAPTURE ===
        const prevOwner = t.ownerId;
        const prevBuilding = t.building;
        const wasHQ = t.building === "HQ";

        // if there was construction/demolishing action (HAS TO BE BEFORE BUILDING CLEARING)
        if (t.buildingAction) {
          t.buildingAction = null; 
        }

        // building clearing / owning
        if(prevBuilding && attackingPlayer){
          const defendingPlayer = state.players.get(String(t.ownerId))
          if(attackingPlayer && defendingPlayer){
            if (prevBuilding === "BARRACKS") {
              defendingPlayer.buildings.barracks--;
              if(attackingPlayer.buildings.barracks < BUILDING_LIMIT["BARRACKS"]){
                t.building = "BARRACKS";
                attackingPlayer.buildings.barracks++;
              } else
                t.building = null;
            } else if (prevBuilding === "HOUSE") {
              defendingPlayer.buildings.house--;
              if(attackingPlayer.buildings.house < BUILDING_LIMIT["HOUSE"]){
                t.building = "HOUSE";
                attackingPlayer.buildings.house++;
              } else
                t.building = null;
            } else if(prevBuilding === "FORT") {
              t.building = null;
              defendingPlayer.buildings.fort--;
            } else if(prevBuilding === "HQ") {
              t.building = null;
            } else if (prevBuilding === "LABORATORY") {
              defendingPlayer.buildings.laboratory--;
              t.building = null;
            } else if(prevBuilding === "SIEGE_OUTPOST") {
              t.building = null;
              defendingPlayer.buildings.siege_outpost--;
            } else {
              t.building = null;
            }
          }
        }
        if(attackingPlayer && !t.ownerId){
          const gain = Math.min(BASE_GOLD_MAX, attackingPlayer.gold + NEUTRAL_TILE_CAPTURE_GOLD * t.baseDefense) - attackingPlayer.gold;
          if (gain !== 0) modifyPlayerResources(state, attackingPlayer, 'gold', gain);
          sendPlayerLog(attackingPlayer.id, `+${NEUTRAL_TILE_CAPTURE_GOLD * t.baseDefense} Gold (Tile Captured)`, "#eab308");  
        }
        
        t.ownerId = by;
        t.defenseHeat = 0;
        t.lastDefendedAt = 0;
        t.capture = null;
        updatePlayerStat(by, "tilesCaptured", 1)

        recalcDefense(state);

        if (wasHQ && prevOwner && prevOwner !== by) {
          handlePlayerDeath(state, prevOwner);
          updatePlayerStat(by, "playersEliminated", 1);
          if(attackingPlayer){
            const gain = Math.min(BASE_GOLD_MAX, attackingPlayer.gold + PLAYER_KILL_GOLD_REWARD) - attackingPlayer.gold;
            if (gain !== 0) modifyPlayerResources(state, attackingPlayer, 'gold', gain);
            sendPlayerLog(attackingPlayer.id, `+${PLAYER_KILL_GOLD_REWARD} Gold (Eliminated Player)`, "#eab308");  
          }
        }

        
      }
      
    }
    if (!t.ownerId) continue;

    // reset heat for necessary tiles with owner
    if (now - t.lastDefendedAt > DEFENSE_HEAT_DECAY_MS) {
      t.defenseHeat = 0;
    }

    // check buildingAction for completion
    if (t.buildingAction && now >= t.buildingAction.readyAt) {
      const action = t.buildingAction;
      const tileOwner = state.players.get(t.ownerId);

      if (tileOwner) {
        if (action.actionType === "CONSTRUCTING") {
          // Finalize structure assembly
          t.building = action.building;
          const bKey = action.building.toLowerCase() as keyof typeof tileOwner.buildings;
          tileOwner.buildings[bKey] = Math.min(BUILDING_LIMIT[action.building], tileOwner.buildings[bKey] + 1);
          if (action.building === "FORT") {
            recalcDefense(state);
          }
          sendPlayerLog(tileOwner.id, `Construction of ${action.building} completed`, "#1f6ce0");
        } 
        else if (action.actionType === "DEMOLISHING") {
          // Calculate refund values & decrement building counters upon completion
          const cost = BUILDING_COST[action.building];
          const refund = Math.floor(cost * DEMOLISH_REFUND_RATIO);
          
          const gain = Math.min(BASE_GOLD_MAX, tileOwner.gold + refund) - tileOwner.gold;
          if (gain !== 0) modifyPlayerResources(state, tileOwner, 'gold', gain);
          
          const bKey = action.building.toLowerCase() as keyof typeof tileOwner.buildings;
          tileOwner.buildings[bKey] = Math.max(0, tileOwner.buildings[bKey] - 1);

          // Clear out layout references
          t.building = null;
          recalcDefense(state);
          sendPlayerLog(tileOwner.id, `Demolition of ${action.building} completed`, "#1f6ce0");
        }
      }

      // Finalize the lifecycle event
      t.buildingAction = null;
    }

    const set = state.connectedCache.get(t.ownerId);
    if (!set) continue;
    if (!set.has(key(t.q, t.r))) continue; // CUT OFF

    ownedCount.set(t.ownerId, (ownedCount.get(t.ownerId) ?? 0) + 1);
  }

  // Apply income / regen
  for (const p of state.players.values()) {
    if (p.eliminated) continue;
    if (p.status !== "PLAYING") continue;

    const owned = ownedCount.get(p.id) ?? 0;
    const barracks = p.buildings.barracks ?? 0
    const effectiveOwned = Math.max(0, owned - 1);
    const armyCap = BASE_ARMY_MAX + effectiveOwned * ARMY_CAP_PER_TILE + (p.buildings.house ?? 0) * HOUSE_ARMY_CAP_BONUS;

    //army mult from effects
    let armyEffectMult = 1.0;

    const overclock = p.effects?.find(e => e.type === "ARMY_GAIN_BUFF");
    if (overclock && overclock.durationLeft !== null) {
      if (overclock.durationLeft > EFFECT_DURATIONS["ARMY_GAIN_BUFF"] / 2) {
        armyEffectMult = EFFECT_STRENGTHS["ARMY_GAIN_BUFF"];
      } else {
        armyEffectMult = 1 / EFFECT_STRENGTHS["ARMY_GAIN_BUFF"]; 
      }
    }
    // gold optimum around GOLD_PEAK ratio, army optimum around ARMY_PEAK ratio
    // initial falloff is gradual, then steep toward extremes
    const ratio = armyCap > 0 ? p.army / armyCap : 0;
    const armyMult = Math.max(0.4, 1 - 2.2 * Math.pow(ratio - ARMY_PEAK, 2)); // 2.2 is slope decline rate, higher number faster falloff from optimum
    const goldMult = Math.max(0.4, 1 - 1.95 * Math.pow(ratio - GOLD_PEAK, 2)); // exponent is width of bell

    {
      const goldGain = Math.min(
        BASE_GOLD_MAX,
        p.gold + (owned * GOLD_PER_TILE + GOLD_PASSIVE) * dt * goldMult
      ) - p.gold;
      if (goldGain !== 0) modifyPlayerResources(state, p, 'gold', goldGain);
    }

    {
      const armyGain = Math.min(
        armyCap,
        p.army + (ARMY_PASSIVE + barracks * BARRACKS_ARMY_BONUS + owned * ARMY_PER_TILE) * dt * armyMult * armyEffectMult
      ) - p.army;
      if (armyGain !== 0) modifyPlayerResources(state, p, 'army', armyGain);
    }
  }
}

export function applyIntent(state: CoreGameState, playerId: PlayerId, intent: any) {
  if (!state?.started || state.gameOver || !intent || typeof intent !== "object") return;

  const type = intent.type;

  if (type === "PLACE_HQ" && state.phase === "HQ_PLACEMENT") {
    if (typeof intent.q !== "number" || typeof intent.r !== "number") return;
    handlePlaceHQ(state, playerId, intent.q, intent.r);
    return;
  }

  if (state.phase === "HQ_PLACEMENT") return;

  // Validate Hex Coordinates for standard map actions
  const needsCoords = ["CAPTURE", "BUILD", "DEMOLISH", "DEFEND"].includes(type);
  if (needsCoords && (typeof intent.q !== "number" || typeof intent.r !== "number")) {
    return; 
  }

  if (type === "CAPTURE") {
    tryCapture(state, playerId, intent.q, intent.r);
  } 
  else if (type === "BUILD") {
    if (!VALID_BUILDINGS.has(intent.buildingType)) return;
    tryBuild(state, playerId, intent.q, intent.r, intent.buildingType as BuildingType);
  } 
  else if (type === "DEMOLISH") {
    handleDemolish(state, playerId, intent.q, intent.r);
  } 
  else if (type === "DEFEND") {
    tryDefend(state, playerId, intent.q, intent.r);
  } 
  else if (type === "BUY_PLAYER_EFFECT") {
    if (!VALID_EFFECTS.has(intent.effectType)) return;
    if (intent.targetPlayerId !== undefined && typeof intent.targetPlayerId !== "string") return;
    
    tryBuyPlayerEffect(state, playerId, intent.effectType, intent.targetPlayerId);
  }
}

export function handlePlayerDeath(
  state: CoreGameState,
  deadPlayerId: PlayerId
) {
  // 1. Remove all tiles owned by the player
  for (const tile of state.tiles.values()) {
    if (tile.ownerId === deadPlayerId) {
      tile.ownerId = null;
      tile.building = null;
      tile.defense = 1; // base defense (will be recalculated anyway)
      tile.buildingAction = null;
    }
  }

  // 2. Remove player from player list
  const player = state.players.get(deadPlayerId);
  if (player) {
    player.eliminated = true;
    updatePlayerStat(player.id, "placement", 8)
    updatePlayerStat(player.id, "survivalTimeSeconds", Date.now())
  }
  

  // 3. Recalculate defenses (important!)
  recalcDefense(state);

  // check if there is only one player left alive or if only bots remain
  checkGameOver(state)
}

export function checkGameOver(state: CoreGameState) {
  let aliveCount = 0;
  let lastAliveId: string | null = null;
  let realPlayerInRoom = 0;

  for (const p of state.players.values()) {
    if (!p.isBot) realPlayerInRoom++;
    if (p.status === "PLAYING" && !p.eliminated) {
      aliveCount += 1;
      lastAliveId = p.id;
    }
  }

  if (aliveCount <= 1 && lastAliveId) {
    state.gameOver = { winner: lastAliveId };
    if (lastAliveId) {
      updatePlayerStat(lastAliveId, "placement", 1);
      updatePlayerStat(lastAliveId, "survivalTimeSeconds", Date.now());
    }
  } else if (realPlayerInRoom <= 0) {
    state.gameOver = { winner: lastAliveId ? lastAliveId : "BOTS" };
  }
}

export function computeConnectedTilesFromHQ(
  state: CoreGameState,
  playerId: PlayerId
): Set<string> {
  if(!playerId) return new Set()
  const visited = new Set<string>();
  const stack: Array<{ q: number; r: number }> = [];

  // Find HQ
  let hqTile: { q: number; r: number } | null = null;
  const player = state.players.get(playerId);
  if (player) {
    hqTile = player.hqPos;
  }

  if (!hqTile) return visited;

  stack.push(hqTile);
  visited.add(key(hqTile.q, hqTile.r));

  while (stack.length > 0) {
    const cur = stack.pop()!;

    for (const n of neighbors(cur.q, cur.r)) {
      const t = getTile(state, n.q, n.r);
      if (!t) continue;
      if (t.ownerId !== playerId) continue;

      const k = key(t.q, t.r);
      if (visited.has(k)) continue;

      visited.add(k);
      stack.push({ q: t.q, r: t.r });if(!playerId) return new Set()
    }
  }

  return visited;
}

export function getConnectedTilesFromHQ(
  state: CoreGameState,
  playerId: PlayerId
): Set<string> {
  return state.connectedCache?.get(playerId) ?? new Set();
}

export function isTileConnectedToHQ(
  state: CoreGameState,
  playerId: PlayerId,
  q: number,
  r: number
): boolean {
  const connected = getConnectedTilesFromHQ(state, playerId);
  return connected.has(key(q, r));
}

export function handleDemolish(
  state: CoreGameState,
  playerId: PlayerId,
  q: number,
  r: number
) {
  const tile = getTile(state, q, r);
  if (!tile) return;
  if (tile.ownerId !== playerId) return;
  if (!tile.building || tile.building === "HQ") return;
  if (tile.buildingAction !== null) return;

  const player = state.players.get(playerId)
  if(!player) return;
  if (!isTileConnectedToHQ(state, playerId, q, r)) return;

  const durationMs = BUILDING_DEMOLISH_TIME[tile.building] * 1000;
  tile.buildingAction = {
    building: tile.building,
    actionType: "DEMOLISHING",
    readyAt: Date.now() + durationMs
  };
}

export function applyEffectToTile(
  state: CoreGameState,
  q: number,
  r: number,
  type: TileEffectType,
  duration: number | null,
  sourcePlayerId: string | null = null
): boolean {
  const tileKey = `${q},${r}`;
  const tile = state.tiles.get(tileKey);
  
  if (!tile) return false; // Hex tile not found

  // Check if this specific effect type is already running on the tile
  const existingEffect = tile.effects.find((e) => e.type === type);

  if (existingEffect) {
    if (duration === null) {
      existingEffect.durationLeft = null;
    } else if (existingEffect.durationLeft !== null) {
      existingEffect.durationLeft = Math.max(existingEffect.durationLeft, duration);
    }
    existingEffect.sourcePlayerId = sourcePlayerId;

  } else {
    const newEffect: TileEffect = {
      type,
      durationLeft: duration,
      sourcePlayerId
    };
    tile.effects.push(newEffect);
  }

  return true;
}

export function hasPlayerEffect(player: PlayerState | undefined, effectType: PlayerEffectType): boolean {
  return player?.effects.some(effect => effect.type === effectType) ?? false;
}

export function tryBuyPlayerEffect(
  state: CoreGameState,
  casterId: PlayerId,
  effectType: PlayerEffectType,
  targetId: PlayerId
) {
  const caster = state.players.get(casterId);
  const target = state.players.get(targetId);


  if (!caster || caster.eliminated || !target || target.eliminated) return;
  if ((caster.buildings.laboratory ?? 0) <= 0) {
    return;
  }
  const cost = EFFECT_COSTS[effectType] ?? 9999;
  if (caster.gold < cost) return;

  // reduce gold by cost
  modifyPlayerResources(state, caster, 'gold', -cost);
  
  const duration = EFFECT_DURATIONS[effectType] ?? 10_000;
  applyEffectToPlayer(state, targetId, effectType, duration, casterId);
}

export function applyEffectToPlayer(
  state: CoreGameState,
  playerId: string,
  type: PlayerEffectType,
  duration: number | null,
  sourcePlayerId: string | null = null
): boolean {
  const player = state.players.get(playerId);
  
  if (!player || player.eliminated) return false;

  // Look for an existing instance of this specific effect
  const existingEffect = player.effects.find((e) => e.type === type);

  if (existingEffect) {
    if (duration === null) {
      // If the new effect is permanent, overwrite the timer entirely
      existingEffect.durationLeft = null;
    } else if (existingEffect.durationLeft !== null) {
      // If both are timed, refresh to whichever duration is longer
      existingEffect.durationLeft = Math.max(existingEffect.durationLeft, duration);
    }
    // Update who cast/triggered the modification last
    existingEffect.sourcePlayerId = sourcePlayerId;
  } else {
    // Add a fresh effect object to the collection
    const newEffect: PlayerEffect = {
      type,
      durationLeft: duration,
      sourcePlayerId
    };
    player.effects.push(newEffect);
  }

  return true;
}

export function modifyPlayerResources(
  state: CoreGameState, 
  player: PlayerState, 
  resource: 'gold' | 'army', 
  amount: number // can be positive or negative
) {
  if (!player) return;

  if (resource === 'gold') {
    player.gold += amount;
    if (amount < 0 && !player.isBot)
      updatePlayerStat(player.id, 'goldSpent', -amount);
  } else if (resource === 'army') {
    player.army += amount;
    if (amount < 0 && !player.isBot)
      updatePlayerStat(player.id, 'armySpent', -amount);
  }
}