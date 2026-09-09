// Verifies CrazyGames user tokens (RS256 JWTs) sent by the client.
// The public key is hosted by CrazyGames and may rotate, so it is cached and
// re-fetched once if verification fails.
// See https://docs.crazygames.com/sdk/user/#get-user-token
import { createVerify } from "node:crypto";

const CRAZYGAMES_PUBLIC_KEY_URL = "https://sdk.crazygames.com/publicKey.json";

export interface CrazyGamesTokenPayload {
  userId: string;
  gameId: string;
  username: string; // 6-20 chars (alphanumeric, period, underscore)
  profilePictureUrl?: string;
  iat?: number;
  exp?: number;
}

let cachedPublicKey: string | null = null;

async function fetchPublicKey(): Promise<string> {
  const resp = await fetch(CRAZYGAMES_PUBLIC_KEY_URL);
  if (!resp.ok) {
    throw new Error(`Failed to fetch CrazyGames public key (HTTP ${resp.status})`);
  }
  const data = (await resp.json()) as { publicKey?: string };
  if (!data?.publicKey) {
    throw new Error("CrazyGames public key response is missing the key");
  }
  cachedPublicKey = data.publicKey;
  return data.publicKey;
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function verifyWithKey(token: string, publicKey: string): CrazyGamesTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed CrazyGames token");
  }
  const [header, payload, signature] = parts;

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${header}.${payload}`);
  verifier.end();
  if (!verifier.verify(publicKey, base64UrlDecode(signature))) {
    throw new Error("Invalid CrazyGames token signature");
  }

  const claims = JSON.parse(base64UrlDecode(payload).toString("utf8")) as CrazyGamesTokenPayload;
  if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now()) {
    throw new Error("CrazyGames token expired");
  }
  if (typeof claims.userId !== "string" || claims.userId.length === 0) {
    throw new Error("CrazyGames token is missing the userId claim");
  }
  if (typeof claims.username !== "string" || claims.username.length === 0) {
    throw new Error("CrazyGames token is missing the username claim");
  }
  return claims;
}

export async function decodeCrazyGamesToken(token: string): Promise<CrazyGamesTokenPayload> {
  const key = cachedPublicKey ?? (await fetchPublicKey());
  try {
    return verifyWithKey(token, key);
  } catch (err) {
    // The key may have rotated; refetch once and retry with the fresh key.
    const freshKey = await fetchPublicKey();
    if (freshKey === key) throw err;
    return verifyWithKey(token, freshKey);
  }
}
