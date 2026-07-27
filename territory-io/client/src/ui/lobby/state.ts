import type { LeaderboardCategory, LeaderboardEntry, PrivateViewMode } from "./types.js";

export interface LobbyRefs {
  topBarRoot: HTMLDivElement;
  notificationEl: HTMLDivElement;
  lobbyRoot: HTMLDivElement;
  returnRoot: HTMLDivElement;
  endResultTextEl: HTMLDivElement;
  playBtn: HTMLButtonElement;
  inputEl: HTMLInputElement;
  statusEl: HTMLDivElement;
  topBarAuthContainer: HTMLDivElement;
  mainButtonsContainer: HTMLDivElement;
  createPrivateContainer: HTMLDivElement;
  joinPrivateContainer: HTMLDivElement;
  inPrivateLobbyContainer: HTMLDivElement;
  fillBotsCheckbox: HTMLInputElement;
  maxPlayersInput: HTMLInputElement;
  privateMapSelect: HTMLSelectElement;
  roomCodeInput: HTMLInputElement;
  roomCodeDisplay: HTMLHeadingElement;
  copyCodeBtn: HTMLButtonElement;
  privatePlayerListEl: HTMLUListElement;
  privateSettingsDisplayEl: HTMLDivElement;
  startPrivateMatchBtn: HTMLButtonElement;
  leaderboardContainer: HTMLDivElement;
  leaderboardTabsEl: HTMLDivElement;
  leaderboardListEl: HTMLUListElement;
}

export const lobbyRuntime = {
  refs: null as LobbyRefs | null,
  isUserAuthenticated: false,
  currentPrivateView: "MAIN" as PrivateViewMode,
  currentLeaderboardTab: "games_played" as LeaderboardCategory,
  leaderboardCache: new Map<LeaderboardCategory, { data: LeaderboardEntry[]; timestamp: number }>()
};

export function setLobbyRefs(refs: LobbyRefs) {
  lobbyRuntime.refs = refs;
}

export function getLobbyRefs(): LobbyRefs {
  if (!lobbyRuntime.refs) {
    throw new Error("Lobby UI has not been initialized yet.");
  }
  return lobbyRuntime.refs;
}
