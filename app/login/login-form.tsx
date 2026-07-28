"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/constants";
import { Button, Notice } from "@/components/ui";

/** Turn Supabase/network errors into something a participant can act on. */
function describe(message: string) {
  const m = message.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("network")) {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (m.includes("rate") || m.includes("too many")) {
    return "Too many attempts. Wait a minute, then try again.";
  }
  return message;
}

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const oauthError = params.get("error");

  const [error, setError] = useState<string | null>(
    oauthError ? describe(oauthError) : null
  );
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setError(null);
    setBusy(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          next
        )}`,
        queryParams: {
          hd: "vitstudent.ac.in",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      console.error("[Login] signInWithOAuth error:", error);
      setError(describe(error.message));
      setBusy(false);
    }
    // On success the browser navigates to Google, so there's nothing else to do here.
  }

  return (
    <div className="space-y-5">
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="button" onClick={signInWithGoogle} disabled={busy} className="w-full">
        {busy ? "Redirecting…" : "Continue with Google"}
      </Button>
      <p className="text-center font-sans text-xs text-muted">
        Only {ALLOWED_EMAIL_DOMAIN} Google accounts can sign in.
      </p>
    </div>
  );
}
