// CrazyGames SDK v3 integration. The SDK script itself is loaded in index.html.
// On CrazyGames domains the player's CrazyGames identity replaces Google auth entirely:
// the SDK provides the username, and the user token is verified server-side where it is
// linked to (or used to create) a Supabase-backed account.

interface CrazyGamesUser {
  username: string;
  profilePictureUrl?: string;
}

interface CrazyGamesSdk {
  init(): Promise<void>;
  environment: string;
  user: {
    isUserAccountAvailable: boolean;
    getUser(): Promise<CrazyGamesUser | null>;
    getUserToken(): Promise<string>;
  };
}

declare global {
  interface Window {
    CrazyGames?: { SDK?: CrazyGamesSdk };
  }
}

let initialized = false;
let environment = "disabled";
let currentUser: CrazyGamesUser | null = null;
let currentToken: string | null = null;
// Username confirmed by the server (may differ from the CrazyGames name if it had to be deduplicated).
let serverUsername: string | null = null;

export async function initCrazyGames(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const sdk = window.CrazyGames?.SDK;
  if (!sdk) return;

  try {
    await sdk.init();
    environment = sdk.environment ?? "disabled";
  } catch {
    environment = "disabled";
    return;
  }

  // Only real CrazyGames domains may drive authentication. The "local" environment returns
  // hardcoded mock users/tokens meant for testing, and "disabled" throws on every call.
  if (environment !== "crazygames") return;

  try {
    if (!sdk.user.isUserAccountAvailable) return;

    const user = await sdk.user.getUser();
    if (!user) return; // not logged in on CrazyGames -> continue as guest

    const token = await sdk.user.getUserToken();
    currentUser = user;
    currentToken = token;
  } catch (err) {
    console.warn("[CrazyGames] Failed to resolve user:", err);
    currentUser = null;
    currentToken = null;
  }
}

export function isCrazyGamesEnvironment(): boolean {
  return environment === "crazygames";
}

export function getCrazyGamesAuth(): { token: string; username: string } | null {
  return currentUser && currentToken
    ? { token: currentToken, username: currentUser.username }
    : null;
}

export function getCrazyGamesDisplayUsername(): string | null {
  return serverUsername ?? currentUser?.username ?? null;
}

export function setCrazyGamesServerUsername(username: string | null): void {
  serverUsername = username;
}

// Drops the cached identity, e.g. when the server rejects the token. The next
// setupAuthAndUsername call then renders the plain guest state.
export function clearCrazyGamesAuth(): void {
  currentUser = null;
  currentToken = null;
  serverUsername = null;
}
