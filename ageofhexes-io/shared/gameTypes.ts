export type TerrainType =
  | "GRASS"
  | "MOUNTAIN"
  | "BEDROCK"
  | "DESERT"
  | "WATER";

export type GamePhase = "HQ_PLACEMENT" | "GAMEPLAY";

export type TileEffectType = 
  | "REINFORCED";

export interface TileEffect {
  type: TileEffectType;
  durationLeft: number | null; // Remaining time in seconds - null for permanent
  sourcePlayerId: string | null; // The player who cast the ability
}

export type PlayerEffectType = 
  | "ATTACK_SPEED"
  | "ARMY_GAIN_BUFF";

export interface PlayerEffect {
  type: PlayerEffectType;
  durationLeft: number | null; // Remaining time in seconds - null for permanent
  sourcePlayerId: string | null; // The player who cast the ability
}

export type PlayerId = string

export type BuildingType = "FORT" | "BARRACKS" | "HOUSE" | "LABORATORY" | "SIEGE_OUTPOST";

export type PlayerStatus =
  | "LOBBY"     // connected, not queued
  | "QUEUED"    // clicked Play, waiting
  | "PLAYING"   // in active match
  | "ELIMINATED";

export interface Axial {
  q: number
  r: number
}

export interface TileState {
  q: number
  r: number
  ownerId: PlayerId | null
  defense: number

  building: "HQ" | BuildingType | null
  
  terrain: TerrainType
  baseDefense: number

  defenseHeat: number
  lastDefendedAt: number

  capture: {
    by: PlayerId;
    remaining: number; // fraction of completed capture, 0-1
    completeAt: number; // timestamp for Date.now()
    cost: number;
  } | null;

  buildingAction: {
    building: BuildingType;
    readyAt: number; // timestamp for Date.now()
    actionType: "CONSTRUCTING" | "DEMOLISHING"
  } | null;

  effects: TileEffect[];
}

export interface PlayerState {
  id: PlayerId
  username: string | null
  color: string;
  status: PlayerStatus;
  gold: number
  army: number
  eliminated: boolean
  hqPos: Axial
  lastSeen: number
  isBot?: boolean

  buildings: {
    fort: number,
    barracks: number,
    house: number,
    laboratory: number,
    siege_outpost: number,
  }

  effects: PlayerEffect[]
}

export interface CoreGameState {
  phase: GamePhase;
  tiles: Map<string, TileState>;
  players: Map<PlayerId, PlayerState>;
  started: boolean;
  gameOver: null | { winner: PlayerId; };
  connectedCache?: Map<PlayerId, Set<string>> | null;
  mapId: null | string;
  mapName: null | string;
  HQLocations: Map<PlayerId, TileState>;
  placementTimeLeft?: number;
}