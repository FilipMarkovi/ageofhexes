// CrazyGames SDK v3 integration. The SDK script is loaded lazily (only when we're likely
// running on CrazyGames) so the normal ageofhexes.io lobby isn't slowed down fetching it.
// On CrazyGames domains the player's CrazyGames identity replaces Google auth entirely:
// the SDK provides the username, and the user token is verified server-side where it is
// linked to (or used to create) a Supabase-backed account.
const CRAZYGAMES_SDK_URL = "https://sdk.crazygames.com/crazygames-sdk-v3.js";

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

// Games only ever run embedded in an iframe on CrazyGames; skip the SDK entirely elsewhere.
// localhost/127.0.0.1 are exempt so the SDK's documented local-testing mode keeps working.
function shouldLoadCrazyGamesSdk(): boolean {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;

  try {
    if (window.self === window.top) return false;
  } catch {
    return true; // cross-origin frame access throws -> we're embedded
  }
  return document.referrer.includes("crazygames.com");
}

function loadCrazyGamesScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CRAZYGAMES_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load CrazyGames SDK script"));
    document.head.appendChild(script);
  });
}

export async function initCrazyGames(): Promise<CrazyGamesSdk | undefined> {
  if (initialized) return;
  initialized = true;

  if (!shouldLoadCrazyGamesSdk()) return;

  try {
    await loadCrazyGamesScript();
  } catch (err) {
    console.warn("[CrazyGames] SDK script failed to load:", err);
    return;
  }

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
    if (sdk.user.isUserAccountAvailable) {
      const user = await sdk.user.getUser();
      if (user) {
        currentUser = user;
        currentToken = await sdk.user.getUserToken();
      }
    }
  } catch (err) {
    console.warn("[CrazyGames] Failed to resolve user:", err);
    currentUser = null;
    currentToken = null;
  }

  return sdk;
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
