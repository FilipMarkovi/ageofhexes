// server/ai/botManager.ts

import type { GameRoom } from "../util/rooms.js";
import { applyIntent } from "../../../system/index.js";
import { deadlyAI } from "./simpleExpandBot.js";

const botCooldowns = new Map<string, number>();

export function runBots(room: GameRoom) {
  const now = Date.now();

  for (const [pid, player] of room.state.players) {
    if (!player.isBot) continue;
    if (player.eliminated) continue;
    if (player.status !== "PLAYING") continue;

    // Check if this specific bot's randomized staggered delay has passed
    const nextReadyTime = botCooldowns.get(pid) || 0;
    if (now < nextReadyTime) {
      continue; // Skip this bot for this tick; its staggered delay is still counting down
    }

    // 80% chance to attempt an action execution
    if (Math.random() < 0.8) {
      const intent = deadlyAI(room.state, pid);
      if (intent) {
        applyIntent(room.state, pid, intent);
      }
    }

    // Generates a random base delay between 200ms and 600ms + an extra tiny micro-variance 
    const baseInterval = 200; // How long between overall actions
    const humanVariance = Math.floor(Math.random() * 250); // Adds 0 to 250ms of organic offset
    
    botCooldowns.set(pid, now + baseInterval + humanVariance);
  }
}