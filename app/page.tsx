import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink, Chip, Panel } from "@/components/ui";
import { ChipMark, LogoLockup, Wordmark } from "@/components/logo";
import { EVENT, TRACKS } from "@/lib/constants";

export default async function Home() {
  // The landing page must render even if Supabase is unreachable — it is the
  // page people hit first, and a sign-in outage should not take it down.
  let user = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  return (
    <main className="min-h-screen bg-paper">
      {/* ---------- nav ---------- */}
      <nav className="sticky top-0 z-50 border-b-[3px] border-ink bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <LogoLockup />
          <ButtonLink href={user ? "/dashboard" : "/login"} className="!px-4 !py-2 !text-xs">
            {user ? "Dashboard" : "Register"}
          </ButtonLink>
        </div>
      </nav>

      {/* ---------- hero ---------- */}
      <section className="border-b-[3px] border-ink bg-ink">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
          <Chip tone="purple">A two-day AI challenge</Chip>

          <h1 className="mt-6 font-display text-[15vw] leading-[0.85] text-paper sm:text-[9rem]">
            FRONT<span className="text-purple">IER</span>
          </h1>

          <div className="mt-6 flex flex-wrap items-stretch gap-0">
            <div className="border-[3px] border-paper px-5 py-2.5 font-mono text-sm uppercase tracking-[0.3em] text-paper">
              Build the next
            </div>
            <div className="border-[3px] border-l-0 border-paper bg-purple px-5 py-2.5 font-mono text-sm font-bold uppercase tracking-[0.3em] text-paper">
              AI
            </div>
          </div>

          <p className="mt-8 max-w-xl font-sans text-lg text-grey">
            An AI research and agentic product-development challenge. Two days, five
            tracks, one working build. Open to all VIT Chennai students.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <ButtonLink href={user ? "/dashboard" : "/login"} variant="primary">
              {user ? "Go to dashboard" : "Register your team"}
            </ButtonLink>
            <ButtonLink href="#tracks" variant="paper">
              See the tracks
            </ButtonLink>
          </div>

          {/* stat blocks */}
          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            <div className="border-[3px] border-paper bg-purple p-5 shadow-brut-paper">
              <div className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-paper/80">
                Prize pool
              </div>
              <div className="mt-2 font-display text-4xl text-paper">{EVENT.prize}</div>
            </div>
            <div className="border-[3px] border-paper bg-ink p-5 shadow-brut-paper">
              <div className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-purple-dim">
                When
              </div>
              <div className="mt-2 font-display text-3xl text-paper">{EVENT.dates}</div>
            </div>
            <div className="border-[3px] border-paper bg-ink p-5 shadow-brut-paper">
              <div className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-purple-dim">
                Where
              </div>
              <div className="mt-2 font-display text-2xl leading-tight text-paper">
                {EVENT.venue}
              </div>
              <div className="mt-1 font-mono text-xs uppercase tracking-widest text-grey">
                {EVENT.venueDetail}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- tracks ---------- */}
      <section id="tracks" className="border-b-[3px] border-ink">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl sm:text-5xl">FIVE TRACKS</h2>
            <p className="label">pick one when you create your team</p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TRACKS.map((track, i) => (
              <div
                key={track}
                className="group border-[3px] border-ink bg-paper p-6 shadow-brut transition-all duration-100 hover:translate-x-[6px] hover:translate-y-[6px] hover:shadow-none"
              >
                <div className="flex h-10 w-10 items-center justify-center border-[3px] border-ink bg-ink font-mono text-sm font-bold text-paper group-hover:bg-purple">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-5 font-display text-xl leading-tight">
                  {track.toUpperCase()}
                </h3>
              </div>
            ))}
            <div className="border-[3px] border-dashed border-ink bg-purple-wash p-6">
              <p className="font-sans text-sm text-ink">
                Not sure which one fits? Pick the closest — you can change your track
                with your team lead up until judging opens.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- how to enter ---------- */}
      <section className="border-b-[3px] border-ink bg-purple-wash">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-display text-4xl sm:text-5xl">HOW TO ENTER</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Register",
                d: "Sign in with your VIT student email. We send a 6-digit code — type it in, and fill your name and registration number.",
              },
              {
                n: "02",
                t: "Form your team",
                d: "Create a team and share your join code, or enter a code you were given. Teams are 1 to 4 people. Solo entries are welcome.",
              },
              {
                n: "03",
                t: "Submit your deck",
                d: "Download the slide template, fill it in during the build, and upload it here before demos on Day 2.",
              },
            ].map((step) => (
              <Panel key={step.n} className="p-6">
                <div className="flex h-10 w-10 items-center justify-center border-[3px] border-ink bg-purple font-mono text-sm font-bold text-paper">
                  {step.n}
                </div>
                <h3 className="mt-5 font-display text-2xl">{step.t.toUpperCase()}</h3>
                <p className="mt-3 font-sans text-sm leading-relaxed text-muted">{step.d}</p>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- event flow (placeholder) ---------- */}
      <section className="border-b-[3px] border-ink">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl sm:text-5xl">EVENT FLOW</h2>
            <Chip tone="orange">Coming soon</Chip>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Panel tone="ink" className="p-7">
              <Chip tone="purple">Day 1</Chip>
              <div className="mt-4 font-display text-2xl">{EVENT.day1}</div>
              <p className="mt-2 font-mono text-sm text-grey">{EVENT.day1Detail}</p>
              <div className="mt-6 border-[3px] border-dashed border-grey/50 p-5">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-grey">
                  Hour-by-hour schedule
                </p>
                <p className="mt-2 font-sans text-sm text-grey">
                  Published closer to the event.
                </p>
              </div>
            </Panel>

            <Panel tone="ink" className="p-7">
              <Chip tone="purple">Day 2</Chip>
              <div className="mt-4 font-display text-2xl">{EVENT.day2}</div>
              <p className="mt-2 font-mono text-sm text-grey">{EVENT.day2Detail}</p>
              <div className="mt-6 border-[3px] border-dashed border-grey/50 p-5">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-grey">
                  Demo slots &amp; judging criteria
                </p>
                <p className="mt-2 font-sans text-sm text-grey">
                  Published closer to the event.
                </p>
              </div>
            </Panel>
          </div>
        </div>
      </section>

      {/* ---------- cta ---------- */}
      <section className="border-b-[3px] border-ink bg-purple">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-14">
          <div>
            <h2 className="font-display text-4xl text-paper sm:text-5xl">
              FREE TO PARTICIPATE
            </h2>
            <p className="mt-3 font-mono text-sm uppercase tracking-[0.14em] text-paper/80">
              Registration closes when the hall fills
            </p>
          </div>
          <ButtonLink href={user ? "/dashboard" : "/login"} variant="paper">
            {user ? "Go to dashboard" : "Register now"}
          </ButtonLink>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="bg-ink">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div>
              <Wordmark className="text-3xl text-paper" />
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-grey">
                {EVENT.venue} · {EVENT.venueDetail}
              </p>
            </div>
            <div className="font-sans text-sm text-grey">
              <p className="label-muted !text-purple-dim">Faculty coordinators</p>
              <p className="mt-2">{EVENT.facultyCoordinators}</p>
              <p className="label-muted !text-purple-dim mt-5">Student coordinator</p>
              <p className="mt-2">
                {EVENT.studentCoordinator} · {EVENT.studentCoordinatorPhone}
              </p>
            </div>
            <div className="font-sans text-sm text-grey">
              <p className="label-muted !text-purple-dim">Find us</p>
              <p className="mt-2">{EVENT.instagram}</p>
              <p>{EVENT.website}</p>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t-[3px] border-panel pt-6">
            <div className="flex items-center gap-3">
              <ChipMark size={22} inner="#0E141B" />
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-grey">
                AWS Student Builder Groups · VIT Chennai
              </span>
            </div>
            <Link
              href="/admin"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-purple-dim"
            >
              Organisers
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
