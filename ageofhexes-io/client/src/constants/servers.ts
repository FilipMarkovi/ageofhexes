export interface ServerOption {
  id: string;
  label: string;
  host: string;
}

// To add a new server region, just append another entry here.
export const SERVER_OPTIONS: ServerOption[] = [
  { id: "eu-central", label: "EU Central", host: "eu.ageofhexes.io" },
  { id: "us-east", label: "US East", host: "us.ageofhexes.io" },
];

export const DEFAULT_SERVER_ID = "eu-central";

const SELECTED_SERVER_STORAGE_KEY = "aoh_selected_server_id";

export function getSelectedServerId(): string {
  const stored = localStorage.getItem(SELECTED_SERVER_STORAGE_KEY);
  if (stored && SERVER_OPTIONS.some((opt) => opt.id === stored)) {
    return stored;
  }
  return DEFAULT_SERVER_ID;
}

export function setSelectedServerId(id: string) {
  if (!SERVER_OPTIONS.some((opt) => opt.id === id)) return;
  localStorage.setItem(SELECTED_SERVER_STORAGE_KEY, id);
}

export function getSelectedServerHost(): string {
  const id = getSelectedServerId();
  return SERVER_OPTIONS.find((opt) => opt.id === id)?.host
    ?? SERVER_OPTIONS.find((opt) => opt.id === DEFAULT_SERVER_ID)!.host;
}

// Times the WebSocket handshake as a rough ping; Infinity on failure/timeout.
function measureServerLatency(host: string, timeoutMs = 2000): Promise<number> {
  return new Promise((resolve) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const start = performance.now();
    let settled = false;
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${protocol}//${host}`);
    } catch {
      resolve(Infinity);
      return;
    }

    const finish = (latency: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      ws.onopen = null;
      ws.onerror = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      resolve(latency);
    };

    const timer = setTimeout(() => finish(Infinity), timeoutMs);
    ws.onopen = () => finish(performance.now() - start);
    ws.onerror = () => finish(Infinity);
  });
}

// Pings every known server and returns the id with the lowest latency.
export async function findBestServerId(): Promise<string> {
  const results = await Promise.all(
    SERVER_OPTIONS.map(async (opt) => ({ id: opt.id, latency: await measureServerLatency(opt.host) }))
  );
  const best = results.reduce((a, b) => (b.latency < a.latency ? b : a));
  return Number.isFinite(best.latency) ? best.id : DEFAULT_SERVER_ID;
}

// Returns the stored server choice, or pings all servers and stores the fastest one if none was picked yet.
export async function getSelectedServerIdAsync(): Promise<string> {
  const stored = localStorage.getItem(SELECTED_SERVER_STORAGE_KEY);
  if (stored && SERVER_OPTIONS.some((opt) => opt.id === stored)) {
    return stored;
  }
  const bestId = await findBestServerId();
  setSelectedServerId(bestId);
  return bestId;
}

export async function getSelectedServerHostAsync(): Promise<string> {
  const id = await getSelectedServerIdAsync();
  return SERVER_OPTIONS.find((opt) => opt.id === id)?.host
    ?? SERVER_OPTIONS.find((opt) => opt.id === DEFAULT_SERVER_ID)!.host;
}
