"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_EMAIL_DOMAIN, isAllowedEmail } from "@/lib/constants";
import { Button, Field, Notice } from "@/components/ui";

/** Turn Supabase/network errors into something a participant can act on. */
function describe(message: string) {
  const m = message.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("network")) {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (m.includes("rate") || m.includes("too many")) {
    return "Too many attempts. Wait a minute, then try again.";
  }
  if (m.includes("database error") || m.includes("unexpected_failure")) {
    return "Sign-up was rejected. Make sure you're using your VIT student email.";
  }
  return message;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const clean = email.trim().toLowerCase();
    if (!isAllowedEmail(clean)) {
      setError(`Use your VIT student email — it must end in ${ALLOWED_EMAIL_DOMAIN}`);
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true },
    });
    setBusy(false);

    if (error) {
      console.error("[Login] signInWithOtp error:", error);
      setError(describe(error.message));
      return;
    }

    setEmail(clean);
    setStep("code");
    setNotice(`We sent a verification code to ${clean}. It expires in 1 hour.`);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setBusy(false);

    if (error) {
      console.error("[Login] verifyOtp error:", error);
      const m = error.message.toLowerCase();
      if (m.includes("failed to fetch") || m.includes("network")) {
        setError(describe(error.message));
      } else if (m.includes("expired")) {
        setError("That code has expired. Send yourself a new one.");
      } else {
        setError("That code is not right. Check the email and try again.");
      }
      return;
    }

    router.push(next);
    router.refresh();
  }

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="space-y-5">
        <Field
          label="VIT student email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={`yourname.2023${ALLOWED_EMAIL_DOMAIN}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint={`Only ${ALLOWED_EMAIL_DOMAIN} addresses can register.`}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Sending…" : "Send me a code"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-5">
      {notice && <Notice tone="info">{notice}</Notice>}
      <Field
        label="Verification code"
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        maxLength={8}
        placeholder="00000000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        className="text-center font-mono text-2xl tracking-[0.3em]"
      />
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" disabled={busy || code.length < 6} className="w-full">
        {busy ? "Verifying…" : "Verify & continue"}
      </Button>
      <button
        type="button"
        onClick={() => {
          setStep("email");
          setCode("");
          setError(null);
          setNotice(null);
        }}
        className="w-full font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted underline underline-offset-4 hover:text-purple"
      >
        Use a different email
      </button>
    </form>
  );
}
