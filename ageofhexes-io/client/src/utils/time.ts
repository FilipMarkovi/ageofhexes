import { clientNetState } from "../state/clientState.js";

/**
 * Returns the estimated current time on the server.
 * Uses the clock offset calculated during STATE updates.
 */
export function getServerNow() {
  return Date.now() + (clientNetState.serverClockOffset || 0);
}
