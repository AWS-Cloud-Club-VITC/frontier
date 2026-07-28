import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withBasePath } from "@/lib/base-path";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${withBasePath(next)}`);
    }
    console.error("[Auth callback] exchangeCodeForSession error:", error);
  }

  const url = new URL(withBasePath("/login"), origin);
  url.searchParams.set("error", "Sign-in failed. Make sure you used your VIT Google account.");
  return NextResponse.redirect(url);
}
