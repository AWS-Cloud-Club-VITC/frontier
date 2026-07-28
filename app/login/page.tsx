import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { LogoLockup, Wordmark } from "@/components/logo";
import { Chip } from "@/components/ui";

export const metadata = { title: "Sign in · FRONTIER 2026" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* left: brand panel */}
      <aside className="hidden flex-col justify-between border-r-[3px] border-ink bg-ink p-10 lg:flex">
        <LogoLockup onDark />
        <div>
          <Wordmark className="text-6xl text-paper" />
          <div className="mt-5 flex flex-wrap">
            <div className="border-[3px] border-paper px-4 py-2 font-mono text-xs uppercase tracking-[0.28em] text-paper">
              Build the next
            </div>
            <div className="border-[3px] border-l-0 border-paper bg-purple px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.28em] text-paper">
              AI
            </div>
          </div>
          <p className="mt-8 max-w-sm font-sans text-base text-grey">
            Register, form your team, and submit your deck — all from here.
          </p>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          July 30 &amp; 31 · Netaji Auditorium · VIT Chennai
        </p>
      </aside>

      {/* right: form */}
      <section className="flex flex-col justify-center bg-paper px-5 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden">
            <LogoLockup />
          </div>

          <div className="mt-8 lg:mt-0">
            <Chip tone="purple">Registration</Chip>
            <h1 className="mt-5 font-display text-4xl leading-none">SIGN IN</h1>
            <p className="mt-4 font-sans text-base text-muted">
              New here? Signing in creates your account. No password to remember — use
              your VIT Google account.
            </p>
          </div>

          <div className="mt-9 border-[3px] border-ink bg-paper p-6 shadow-brut sm:p-8">
            <Suspense
              fallback={<p className="font-mono text-sm text-muted">Loading…</p>}
            >
              <LoginForm />
            </Suspense>
          </div>

          <Link
            href="/"
            className="mt-8 inline-block font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted underline underline-offset-4 hover:text-purple"
          >
            ← Back to the event page
          </Link>
        </div>
      </section>
    </main>
  );
}
