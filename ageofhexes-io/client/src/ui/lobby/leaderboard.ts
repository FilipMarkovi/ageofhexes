import { supabase } from "../../utils/db.js";
import { escapeHtml } from "./helpers.js";
import { getLobbyRefs, lobbyRuntime } from "./state.js";
import type { LeaderboardCategory, LeaderboardEntry } from "./types.js";

export async function fetchLeaderboard(category: LeaderboardCategory) {
  const refs = getLobbyRefs();
  lobbyRuntime.currentLeaderboardTab = category;

  refs.leaderboardTabsEl.querySelectorAll("button").forEach((btn) => {
    const isSelected = btn.getAttribute("data-cat") === category;
    (btn as HTMLButtonElement).style.background = isSelected ? "#2563eb" : "transparent";
    (btn as HTMLButtonElement).style.color = isSelected ? "white" : "#94a3b8";
  });

  const now = Date.now();
  const cached = lobbyRuntime.leaderboardCache.get(category);

  if (cached && now - cached.timestamp < 120000) {
    renderLeaderboard(cached.data);
    return;
  }

  refs.leaderboardListEl.innerHTML = '<div style="text-align:center; padding: 28px; color: #94a3b8; font: 500 14px system-ui;">Loading...</div>';

  try {
    const { data, error } = await supabase
      .from("leaderboard_top10")
      .select("stat_type, username, score")
      .eq("stat_type", category)
      .order("score", { ascending: false })
      .limit(10);

    if (error) throw error;

    const leaderboardData = (data || []) as LeaderboardEntry[];
    lobbyRuntime.leaderboardCache.set(category, { data: leaderboardData, timestamp: now });

    if (lobbyRuntime.currentLeaderboardTab === category) {
      renderLeaderboard(leaderboardData);
    }
  } catch (err) {
    console.error("Failed to fetch leaderboard:", err);
    refs.leaderboardListEl.innerHTML = '<div style="text-align:center; padding: 28px; color: #f87171; font: 500 14px system-ui;">Failed to load</div>';
  }
}

export function renderLeaderboard(data: LeaderboardEntry[]) {
  const refs = getLobbyRefs();

  if (data.length === 0) {
    refs.leaderboardListEl.innerHTML = '<div style="text-align:center; padding: 28px; color: #94a3b8; font: 500 14px system-ui;">No data yet</div>';
    return;
  }

  refs.leaderboardListEl.innerHTML = data
    .map((entry, i) => {
      return `
      <li style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:rgba(255,255,255,0.05); border-radius:10px; font: 500 14px system-ui;">
        <span style="color:#94a3b8; width: 28px; font-weight: 700;">${i + 1}.</span>
        <span style="flex:1; color:white; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin:0 12px;">${escapeHtml(entry.username)}</span>
        <span style="font-weight:700; color:#38bdf8; font-size:15px;">${entry.score.toLocaleString()}</span>
      </li>
    `;
    })
    .join("");
}
