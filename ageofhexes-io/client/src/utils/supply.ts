import type { CoreGameState, PlayerId } from "../../../shared/index.js";
import { HEX_DIRECTIONS } from "../../../shared/constants.js";

export function key(q: number, r: number) {
  return `${q},${r}`;
}

export function neighbors(q: number, r: number) {
  return HEX_DIRECTIONS.map(d => ({ q: q + d.q, r: r + d.r }));
}
export function getConnectedTilesFromHQ_Client(
  state: CoreGameState,
  playerId: PlayerId
): Set<string> {
  const visited = new Set<string>();
  const stack: Array<{ q: number; r: number }> = [];

  // Find HQ
  let hq: { q: number; r: number } | null = null;

  for (const t of state.tiles.values()) {
    if (t.ownerId === playerId && t.building === "HQ") {
      hq = { q: t.q, r: t.r };
      break;
    }
  }

  if (!hq) return visited;

  stack.push(hq);
  visited.add(key(hq.q, hq.r));

  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const n of neighbors(cur.q, cur.r)) {
      const t = state.tiles.get(key(n.q, n.r));
      if (!t) continue;
      if (t.ownerId !== playerId) continue;

      const k = key(t.q, t.r);
      if (visited.has(k)) continue;

      visited.add(k);
      stack.push({ q: t.q, r: t.r });
    }
  }

  return visited;
}
