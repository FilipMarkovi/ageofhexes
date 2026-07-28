import type { GameMapDefinition } from "./types.js";
import { TerrainType } from "../../shared/index.js"
const CHAR_TO_TERRAIN: Record<string, TerrainType | null> = {
  G: "GRASS",
  M: "MOUNTAIN",
  B: "BEDROCK",
  D: "DESERT",
  W: "WATER",
  ".": null
};

export function asciiToGameMap(
  id: string,
  ascii: string,
  name?: string,
  playercount: number = 6
): GameMapDefinition {
  const hexes: GameMapDefinition["hexes"] = [];
  // remove empty lines but KEEP indentation
  const lines = ascii
    .split("\n")
    .map(l => l.replace(/\s+$/, ""))
    .filter(l => l.trim().length > 0);

  for (let r = 0; r < lines.length; r++) {
    const line = lines[r];

    // count leading spaces (2 spaces = 1 hex shift visually)
    const leadingSpaces = line.match(/^ */)?.[0].length ?? 0;
    const indentCols = Math.floor(leadingSpaces / 2);

    const cells = line.trim().split(/\s+/);

    for (let col = 0; col < cells.length; col++) {
      const ch = cells[col];
      const terrain = CHAR_TO_TERRAIN[ch];
      if (!terrain) continue;

      // axial q coordinate
      const q = col + indentCols - Math.floor(r / 2);

      hexes.push({ q, r, terrain });

    }
  }

  return {
    id,
    name: name ?? id,
    hexes,
    playerCount: playercount
  };
}
