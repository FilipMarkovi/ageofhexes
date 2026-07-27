import { loginWithGoogle, supabase } from "../../utils/db.js";
import { getOrCreateGuestName, escapeHtml } from "./helpers.js";
import { getLobbyRefs, lobbyRuntime } from "./state.js";

export async function setupAuthAndUsername(sendIntent?: (intent: any) => void) {
  const refs = getLobbyRefs();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // If user exists and token is valid
  if (user && !userError) {
    let username = getOrCreateGuestName();

    try {
      const { data: profile } = await supabase
        .from("players")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.username) {
        username = profile.username;
      }
    } catch {
      console.warn("Failed to fetch username from database. Using random guest name.");
    }

    refs.inputEl.value = username;
    lobbyRuntime.isUserAuthenticated = true;
    refs.inputEl.disabled = true;
    refs.inputEl.style.opacity = "0.8";
    refs.inputEl.style.cursor = "default";

    const safeUsername = escapeHtml(username);

    refs.topBarAuthContainer.innerHTML = `
      <button id="user-menu-trigger" style="background:none; border:none; color:#38bdf8; font:600 14px system-ui; cursor:pointer; display:flex; align-items:center; gap:4px; padding:4px 8px;">
        ${safeUsername} ▾
      </button>
      <div id="auth-dropdown" style="display:none; position:absolute; right:0; top:calc(100% + 8px); background:#1e293b; border:1px solid rgba(255,255,255,0.1); border-radius:6px; min-width:190px; box-shadow:0 4px 12px rgba(0,0,0,0.5); overflow:hidden;">
        <button id="change-username-btn" style="width:100%; text-align:left; background:none; border:none; color:#e2e8f0; font:500 13px system-ui; padding:10px 12px; cursor:pointer; transition:background 0.2s;">
          Change Username
        </button>
        <button id="logout-btn" style="width:100%; text-align:left; background:none; border:none; color:#ef4444; font:500 13px system-ui; padding:10px 12px; cursor:pointer; transition:background 0.2s;">
          Log Out
        </button>
      </div>
    `;

    const trigger = refs.topBarAuthContainer.querySelector("#user-menu-trigger") as HTMLButtonElement;
    const dropdown = refs.topBarAuthContainer.querySelector("#auth-dropdown") as HTMLDivElement;
    const changeUsernameBtn = refs.topBarAuthContainer.querySelector("#change-username-btn") as HTMLButtonElement;
    const logoutBtn = refs.topBarAuthContainer.querySelector("#logout-btn") as HTMLButtonElement;

    trigger.onclick = (e) => {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
    };

    changeUsernameBtn.onmouseenter = () => {
      changeUsernameBtn.style.background = "rgba(255, 255, 255, 0.08)";
    };
    changeUsernameBtn.onmouseleave = () => {
      changeUsernameBtn.style.background = "none";
    };

    changeUsernameBtn.onclick = () => {
      if (!sendIntent) return;

      dropdown.style.display = "none";
      const current = refs.inputEl.value;
      const requested = window.prompt("Enter new username (1-15 chars)", current);
      if (requested === null) return;

      const next = requested.trim();
      if (next.length < 1 || next.length > 15) {
        window.alert("Username must be between 1 and 15 characters.");
        return;
      }

      sendIntent({ type: "CHANGE_USERNAME", username: next });
    };

    logoutBtn.onmouseenter = () => {
      logoutBtn.style.background = "rgba(239, 68, 68, 0.1)";
    };
    logoutBtn.onmouseleave = () => {
      logoutBtn.style.background = "none";
    };

    logoutBtn.onclick = async () => {
      if (sendIntent) {
        sendIntent({ type: "LOGOUT" });
      }
      await supabase.auth.signOut();
      setupAuthAndUsername(sendIntent);
    };

    return;
  }

  // 2. FALLBACK: Unauthenticated state (Expired token, logged out, or no session)
  refs.inputEl.value = getOrCreateGuestName();
  lobbyRuntime.isUserAuthenticated = false;
  refs.inputEl.disabled = false;
  refs.inputEl.style.opacity = "1";
  refs.inputEl.style.cursor = "text";

  refs.topBarAuthContainer.innerHTML = `
    <button id="top-google-login"
      style="padding:6px 12px;border-radius:8px;border:none;background:#4285F4;color:white;cursor:pointer;font:600 13px system-ui;display:flex;align-items:center;gap:6px;transition: background 0.2s;">
      <svg width="14" height="14" viewBox="0 0 18 18" style="display:block;">
        <path fill="#FFF" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.56 2.69-3.86 2.69-6.6z" />
        <path fill="#FFF" d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.91-2.26c-.8.54-1.85.86-3.05.86-2.34 0-4.33-1.58-5.04-3.7H.94v2.33A9 9 0 0 0 9 18z" />
        <path fill="#FFF" d="M3.96 10.7a5.4 5.4 0 0 1 0-3.4V4.97H.94a9 9 0 0 0 0 8.06l3.02-2.33z" />
        <path fill="#FFF" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.1A9 9 0 0 0 .94 4.97l3.02 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
      </svg>
      Sign in with Google
    </button>
  `;

  const topGoogleBtn = refs.topBarAuthContainer.querySelector("#top-google-login") as HTMLButtonElement;
  topGoogleBtn.onclick = () => {
    loginWithGoogle();
  };
}
