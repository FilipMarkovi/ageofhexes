import type { GameRoom } from "./rooms.js";
import { PLAYER_COLORS } from "../../../system/core/serverConstants.js";

export function getNextAvailablePlayerColor(room: GameRoom): string {
  const usedColors = new Set<string>();

  for (const player of room.state.players.values()) {
    if (player.color) {
      usedColors.add(player.color);
    }
  }

  const availableColor = PLAYER_COLORS.find((color) => !usedColors.has(color));
  return availableColor ?? PLAYER_COLORS[room.state.players.size % PLAYER_COLORS.length];
}