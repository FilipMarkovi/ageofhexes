// src/supabase.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pqlfbsmfaskjlelaibbe.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_QD3tkn87lhOCkhQzjheNwA_8KmRCY_4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) {
    console.error("OAuth initiation failed:", error.message);
  }
}