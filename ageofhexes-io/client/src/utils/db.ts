// src/supabase.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pqlfbsmfaskjlelaibbe.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_QD3tkn87lhOCkhQzjheNwA_8KmRCY_4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const AUTH_POPUP_MESSAGE = "ageofhexes-auth-complete";

// Runs when the app loads inside the auth popup: waits for the session to land, then
// tells the opener to refresh and closes itself. Returns true if this was the popup.
export async function handleAuthPopupIfNeeded(): Promise<boolean> {
  if (!window.opener || window.opener === window) {
    return false;
  }

  const notifyAndClose = () => {
    try {
      window.opener?.postMessage({ type: AUTH_POPUP_MESSAGE }, window.location.origin);
    } catch {
      // opener may already be gone
    }
    window.close();
  };

  const { data } = await supabase.auth.getSession();
  if (data.session) {
    notifyAndClose();
    return true;
  }

  return new Promise((resolve) => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        sub.subscription.unsubscribe();
        notifyAndClose();
        resolve(true);
      }
    });
  });
}

export async function loginWithGoogle() {
  // 1. Get the OAuth URL without redirecting the main window
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      skipBrowserRedirect: true, // Prevents full-page navigation
    },
  });

  if (error || !data.url) {
    console.error("OAuth initiation failed:", error?.message);
    return;
  }

  // 2. Configure popup dimensions and center it on screen
  const width = 500;
  const height = 600;
  const left = window.screenX + (window.innerWidth - width) / 2;
  const top = window.screenY + (window.innerHeight - height) / 2;

  // 3. Open popup window
  const popup = window.open(
    data.url,
    "GoogleLoginPopup",
    `width=${width},height=${height},top=${top},left=${left},status=no,resizable=yes,scrollbars=yes`
  );

  if (!popup) {
    console.error("Popup was blocked by the browser! Please allow popups.");
    return;
  }

  // 4. Reload once the popup confirms auth completed, and stop watching if it's closed manually.
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.data?.type !== AUTH_POPUP_MESSAGE) {
      return;
    }
    cleanup();
    window.location.reload();
  };

  const closeCheck = window.setInterval(() => {
    if (popup.closed) {
      cleanup();
    }
  }, 500);

  function cleanup() {
    window.removeEventListener("message", onMessage);
    window.clearInterval(closeCheck);
  }

  window.addEventListener("message", onMessage);
}