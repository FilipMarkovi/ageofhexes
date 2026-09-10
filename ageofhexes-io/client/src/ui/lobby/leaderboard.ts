import { supabase } from "../../utils/db.js";
import { escapeHtml } from "./helpers.js";
import { getLobbyRefs, lobbyRuntime } from "./state.js";
import type { LeaderboardCategory, LeaderboardEntry, UserRankData } from "./types.js";

async function fetchUserRank(category: LeaderboardCategory, currentUsername?: string): Promise<UserRankData | null> {
  if (!currentUsername) return null;

  try {
    const { data, error } = await supabase.rpc("get_player_leaderboard_rank", {
      p_username: currentUsername,
      p_stat_type: category,
    });

    if (error || !data) return null;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || row.player_rank === undefined || row.score === undefined) return null;

    return { 
      rank: Number(row.player_rank), 
      score: Number(row.score) 
    };
  } catch (err) {
    console.error("fetchUserRank error:", err);
    return null;
  }
}

export async function fetchLeaderboard(category: LeaderboardCategory, currentUsername?: string) {
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
    const userRankData = await fetchUserRank(category, currentUsername);
    if (lobbyRuntime.currentLeaderboardTab === category) {
      renderLeaderboard(cached.data, currentUsername, userRankData);
    }
    return;
  }

  refs.leaderboardListEl.innerHTML = '<div style="text-align:center; padding: 28px; color: #94a3b8; font: 500 14px system-ui;">Loading...</div>';

  try {
    const [topResult, userRankData] = await Promise.all([
      supabase
        .from("leaderboard_top10")
        .select("*")
        .eq("stat_type", category)
        .order("score", { ascending: false })
        .limit(10),
      fetchUserRank(category, currentUsername),
    ]);

    if (topResult.error) throw topResult.error;

    const leaderboardData = (topResult.data || []) as LeaderboardEntry[];
    lobbyRuntime.leaderboardCache.set(category, { data: leaderboardData, timestamp: now });

    if (lobbyRuntime.currentLeaderboardTab === category) {
      renderLeaderboard(leaderboardData, currentUsername, userRankData);
    }
  } catch (err) {
    console.error("Failed to fetch leaderboard:", err);
    refs.leaderboardListEl.innerHTML = '<div style="text-align:center; padding: 28px; color: #f87171; font: 500 14px system-ui;">Failed to load</div>';
  }
}

export function renderLeaderboard(data: LeaderboardEntry[], currentUsername?: string, userRankData?: UserRankData | null) {
  const refs = getLobbyRefs();

  // scrolling happens in the inner rows container so the footer row stays pinned
  refs.leaderboardListEl.style.maxHeight = "";
  refs.leaderboardListEl.style.overflowY = "";

  if (data.length === 0) {
    refs.leaderboardListEl.innerHTML = '<div style="text-align:center; padding: 28px; color: #94a3b8; font: 500 14px system-ui;">No data yet</div>';
    return;
  }

  // guests share a username pool, so only highlight for verified accounts
  const canHighlight = !!currentUsername && lobbyRuntime.isUserAuthenticated;
  const normalizedUsername = currentUsername?.toLowerCase();
  const isInTop10 = canHighlight && data.some((entry) => entry.username.toLowerCase() === normalizedUsername);

  const rowsHtml = data
    .map((entry, i) => {
      const isMe = canHighlight && entry.username.toLowerCase() === normalizedUsername;
      return `
      <li style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:${isMe ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.05)"}; border:1px solid ${isMe ? "rgba(56,189,248,0.5)" : "transparent"}; border-radius:10px; font: 500 14px system-ui;">
        <span style="color:#94a3b8; width: 28px; font-weight: 700;">${i + 1}.</span>
        <span style="flex:1; color:${isMe ? "#38bdf8" : "white"}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin:0 12px;">${escapeHtml(entry.username)}${isMe ? " (you)" : ""}</span>
        <span style="font-weight:700; color:#38bdf8; font-size:15px;">${entry.score.toLocaleString()}</span>
      </li>
    `;
    })
    .join("");

  let footerHtml = "";
  if (!isInTop10 && canHighlight && userRankData) {
    footerHtml = `
      <div style="text-align:center; padding:6px 0; color:#475569; font:600 12px system-ui; letter-spacing:3px;">• • •</div>
      <li style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:rgba(56,189,248,0.18); border:1px solid rgba(56,189,248,0.5); border-radius:10px; font: 500 14px system-ui;">
        <span style="color:#38bdf8; width: 28px; font-weight: 700;">#${userRankData.rank}</span>
        <span style="flex:1; color:#38bdf8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin:0 12px;">${escapeHtml(currentUsername!)} (you)</span>
        <span style="font-weight:700; color:#38bdf8; font-size:15px;">${userRankData.score.toLocaleString()}</span>
      </li>
    `;
  }

  refs.leaderboardListEl.innerHTML = `<div style="max-height:240px; overflow-y:auto;">${rowsHtml}</div>${footerHtml}`;
}
