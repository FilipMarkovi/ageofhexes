import { ROOM_CODE_LENGTH } from "../../../../shared/constants.js";
import { clientNetState, clientUIState } from "../../state/clientState.js";
import { setPrivateView } from "./privateLobby.js";
import { getLobbyRefs, lobbyRuntime } from "./state.js";
import type { LobbyTopTab } from "./types.js";

type RouteTarget =
  | { kind: "LOBBY" }
  | { kind: "LEADERBOARD" }
  | { kind: "PRIVATE_LOBBY"; roomId: string | null; code: string }
  | { kind: "MATCH"; roomId: string | null };

type RouteActions = {
  sendIntent: (intent: any) => void;
  hideError: () => void;
  showError: (msg: string) => void;
};

function normalizeRoomCode(code: string | null): string {
  return (code ?? "").trim().toUpperCase();
}

function parseCurrentRoute(): RouteTarget {
  const path = window.location.pathname.toLowerCase();
  const params = new URLSearchParams(window.location.search);

  if (path === "/leaderboard") {
    return { kind: "LEADERBOARD" };
  }

  if (path === "/privatelobby") {
    return {
      kind: "PRIVATE_LOBBY",
      roomId: params.get("roomId"),
      code: normalizeRoomCode(params.get("code"))
    };
  }

  if (path === "/match") {
    return { kind: "MATCH", roomId: params.get("roomId") };
  }

  return { kind: "LOBBY" };
}

function buildUrl(route: RouteTarget): string {
  if (route.kind === "LEADERBOARD") {
    return "/leaderboard";
  }

  if (route.kind === "PRIVATE_LOBBY") {
    const params = new URLSearchParams();
    if (route.roomId) {
      params.set("roomId", route.roomId);
    }
    params.set("code", route.code);
    return `/privatelobby?${params.toString()}`;
  }

  if (route.kind === "MATCH") {
    const params = new URLSearchParams();
    if (route.roomId) {
      params.set("roomId", route.roomId);
    }
    const query = params.toString();
    return query ? `/match?${query}` : "/match";
  }

  return "/";
}

function currentUrl(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function applyTopTabStyles(activeTab: LobbyTopTab) {
  const refs = getLobbyRefs();
  const lobbyActive = activeTab === "LOBBY";

  refs.lobbyTabBtn.style.background = lobbyActive ? "rgba(37, 99, 235, 0.9)" : "transparent";
  refs.lobbyTabBtn.style.color = lobbyActive ? "#ffffff" : "#cbd5e1";
  refs.leaderboardTabBtn.style.background = lobbyActive ? "transparent" : "rgba(37, 99, 235, 0.9)";
  refs.leaderboardTabBtn.style.color = lobbyActive ? "#cbd5e1" : "#ffffff";

  refs.lobbyScreenEl.style.display = lobbyActive ? "flex" : "none";
  refs.leaderboardScreenEl.style.display = lobbyActive ? "none" : "flex";
}

export function setLobbyTopTab(tab: LobbyTopTab) {
  lobbyRuntime.currentTopTab = tab;
  applyTopTabStyles(tab);
}

function leavePrivateLobbyIfNeeded(sendIntent: (intent: any) => void, hideError: () => void) {
  if (lobbyRuntime.currentPrivateView === "IN_PRIVATE_LOBBY") {
    sendIntent({ type: "LEAVE_PRIVATE_ROOM" });
  }

  clientNetState.privateRoomCode = null;
  if (clientUIState.phase !== "PLAYING" && clientUIState.phase !== "GAME_OVER") {
    clientNetState.roomId = null;
  }

  if (lobbyRuntime.currentPrivateView !== "MAIN") {
    setPrivateView("MAIN", hideError);
  }
}

export function syncRouteFromState(replace = false) {
  let target: RouteTarget;

  if ((clientUIState.phase === "PLAYING" || clientUIState.phase === "GAME_OVER") && clientNetState.roomId) {
    target = { kind: "MATCH", roomId: clientNetState.roomId };
  } else if (
    lobbyRuntime.currentPrivateView === "IN_PRIVATE_LOBBY" &&
    clientNetState.roomId &&
    clientNetState.privateRoomCode
  ) {
    target = {
      kind: "PRIVATE_LOBBY",
      roomId: clientNetState.roomId,
      code: clientNetState.privateRoomCode
    };
  } else if (lobbyRuntime.currentTopTab === "LEADERBOARD") {
    target = { kind: "LEADERBOARD" };
  } else {
    target = { kind: "LOBBY" };
  }

  const nextUrl = buildUrl(target);
  if (nextUrl === currentUrl()) {
    return;
  }

  const historyMethod = replace ? "replaceState" : "pushState";
  window.history[historyMethod]({ route: target.kind }, "", nextUrl);
}

export function maybeJoinPrivateRoute(actions: RouteActions) {
  const pendingRoute = lobbyRuntime.pendingPrivateJoin;
  if (!pendingRoute) {
    return;
  }

  const refs = getLobbyRefs();
  const code = normalizeRoomCode(pendingRoute.code);
  const username = refs.inputEl.value.trim();

  if (!clientNetState.playerId || !lobbyRuntime.isAuthResolved || username.length === 0) {
    return;
  }

  if (code.length !== ROOM_CODE_LENGTH) {
    lobbyRuntime.pendingPrivateJoin = null;
    lobbyRuntime.attemptedPrivateJoinKey = null;
    actions.showError(`Code must be ${ROOM_CODE_LENGTH} characters.`);
    setPrivateView("JOIN_PRIVATE", actions.hideError);
    syncRouteFromState(true);
    return;
  }

  const joinKey = `${pendingRoute.roomId ?? ""}:${code}`;
  if (lobbyRuntime.attemptedPrivateJoinKey === joinKey) {
    return;
  }

  lobbyRuntime.attemptedPrivateJoinKey = joinKey;
  refs.roomCodeInput.value = code;
  clientUIState.username = username;
  actions.hideError();
  actions.sendIntent({
    type: "JOIN_PRIVATE_ROOM",
    username,
    code
  });
}

export function handleRouteChange(actions: RouteActions) {
  const route = parseCurrentRoute();
  const refs = getLobbyRefs();

  if (route.kind === "MATCH") {
    if (clientUIState.phase !== "PLAYING" && clientUIState.phase !== "GAME_OVER") {
      syncRouteFromState(true);
    }
    return;
  }

  if (clientUIState.phase === "PLAYING" || clientUIState.phase === "GAME_OVER") {
    syncRouteFromState(true);
    return;
  }

  if (route.kind === "PRIVATE_LOBBY") {
    setLobbyTopTab("LOBBY");
    refs.roomCodeInput.value = route.code;
    lobbyRuntime.pendingPrivateJoin = { roomId: route.roomId, code: route.code };

    if (
      lobbyRuntime.currentPrivateView === "IN_PRIVATE_LOBBY" &&
      clientNetState.privateRoomCode === route.code &&
      (!route.roomId || clientNetState.roomId === route.roomId)
    ) {
      return;
    }

    setPrivateView("JOIN_PRIVATE", actions.hideError);
    maybeJoinPrivateRoute(actions);
    return;
  }

  lobbyRuntime.pendingPrivateJoin = null;
  lobbyRuntime.attemptedPrivateJoinKey = null;

  if (route.kind === "LEADERBOARD") {
    leavePrivateLobbyIfNeeded(actions.sendIntent, actions.hideError);
    setLobbyTopTab("LEADERBOARD");
    syncRouteFromState(true);
    return;
  }

  leavePrivateLobbyIfNeeded(actions.sendIntent, actions.hideError);
  setLobbyTopTab("LOBBY");
  syncRouteFromState(true);
}

export function initLobbyRouting(actions: RouteActions) {
  setLobbyTopTab("LOBBY");
  handleRouteChange(actions);
  window.addEventListener("popstate", () => {
    handleRouteChange(actions);
  });
}

export function handleTopTabNavigation(tab: LobbyTopTab, actions: RouteActions) {
  if (tab === "LEADERBOARD") {
    leavePrivateLobbyIfNeeded(actions.sendIntent, actions.hideError);
  } else if (lobbyRuntime.currentPrivateView !== "IN_PRIVATE_LOBBY") {
    setPrivateView("MAIN", actions.hideError);
  }

  setLobbyTopTab(tab);
  syncRouteFromState();
}