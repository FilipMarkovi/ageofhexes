// shared/maps/index.ts
import { GameMapDefinition } from "./types.js";
import { barrier } from "./instances/barrier.js";
import { oasis } from "./instances/oasis.js";
import { thelakes } from "./instances/thelakes.js";
import { greatriver } from "./instances/thegreatriver.js";
import { logomap } from "./instances/logomap.js";
import { hexalandia } from "./instances/hexalandia.js";


export const MAPS = new Map<string, GameMapDefinition>([
  ["barrier", barrier],
  ["oasis", oasis],
  ["thelakes", thelakes],
  ["greatriver", greatriver],
  ["logomap", logomap],
  ["hexalandia", hexalandia],
]); // MUST ADD NEW MAPS TO CLIENT LOBBY.TS FILE AS WELL, OTHERWISE THEY WON'T SHOW UP IN THE LOBBY SELECTION

export type MapId = typeof MAPS extends Map<infer K, any> ? K : never;
