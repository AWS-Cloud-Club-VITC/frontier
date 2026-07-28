import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withBasePath } from "@/lib/base-path";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams } = url;

  // Behind a proxy (e.g. a Vercel rewrite from awscloudclubvit.in to this
  // deployment's own *.vercel.app host), the Host header — and therefore
  // request.url's origin — reflects this deployment, not the public-facing
  // domain. Prefer the forwarded headers the proxy sets so redirects stay on
  // the domain the user actually visited.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;

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

  const loginUrl = new URL(withBasePath("/login"), origin);
  loginUrl.searchParams.set("error", "Sign-in failed. Make sure you used your VIT Google account.");
  return NextResponse.redirect(loginUrl);
}
