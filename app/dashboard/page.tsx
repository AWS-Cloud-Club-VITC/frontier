import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile, getSubmission, getSubmissionDownloadUrl, getTeam, profileIsComplete } from "@/lib/data";
import { withBasePath } from "@/lib/base-path";
import { AppHeader } from "@/components/app-header";
import { CopyCode } from "@/components/copy-code";
import { ButtonLink, Chip, Panel } from "@/components/ui";
import { EVENT, MAX_TEAM_SIZE, SUBMISSIONS_OPEN } from "@/lib/constants";
import { SubmissionForm } from "./submission-form";

export const metadata = { title: "Dashboard · FRONTIER 2026" };

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect(withBasePath("/login"));
  if (!profileIsComplete(profile)) redirect(withBasePath("/onboarding"));

  const { team, members } = profile.team_id
    ? await getTeam(profile.team_id)
    : { team: null, members: [] };

  const submission = team ? await getSubmission(team.id) : null;
  const downloadUrl = submission ? await getSubmissionDownloadUrl(submission.file_path) : null;

  const isLead = team?.leader_id === profile.id;

  return (
    <div className="min-h-screen bg-purple-wash">
      <AppHeader email={profile.email} isAdmin={profile.role === "admin"} />

      <main className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label">Signed in as</p>
            <h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl">
              {profile.full_name?.toUpperCase()}
            </h1>
            <p className="mt-3 font-mono text-sm uppercase tracking-[0.14em] text-muted">
              {profile.reg_no}
            </p>
          </div>
          <Link
            href="/onboarding"
            className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted underline underline-offset-4 hover:text-purple"
          >
            Edit my details
          </Link>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {/* ---------- team ---------- */}
          <div className="lg:col-span-2">
            {team ? (
              <Panel className="p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="label">Your team</p>
                    <h2 className="mt-2 font-display text-3xl leading-none">
                      {team.name.toUpperCase()}
                    </h2>
                    <div className="mt-4">
                      <Chip tone="purple">{team.track}</Chip>
                    </div>
                  </div>
                  {isLead && (
                    <ButtonLink href="/team" variant="dark" className="!px-4 !py-2 !text-xs">
                      Manage team
                    </ButtonLink>
                  )}
                </div>

                <div className="mt-8">
                  <div className="flex items-baseline justify-between">
                    <p className="label-muted">
                      Members · {members.length} of {MAX_TEAM_SIZE}
                    </p>
                    {!isLead && (
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                        Only the lead can edit
                      </p>
                    )}
                  </div>

                  <ul className="mt-4 divide-y-[3px] divide-ink border-[3px] border-ink">
                    {members.map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-3 bg-paper px-5 py-4"
                      >
                        <div>
                          <p className="font-sans text-base font-bold">{m.full_name}</p>
                          <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
                            {m.reg_no}
                          </p>
                        </div>
                        {m.id === team.leader_id && <Chip tone="ink">Lead</Chip>}
                      </li>
                    ))}
                  </ul>
                </div>

                {members.length < MAX_TEAM_SIZE && (
                  <div className="mt-8 border-[3px] border-dashed border-ink bg-purple-wash p-5">
                    <p className="label">Join code</p>
                    <p className="mt-2 font-sans text-sm text-muted">
                      Share this with your teammates. They register with their VIT email,
                      then enter this code — you don&apos;t have to add them yourself.
                    </p>
                    <div className="mt-4">
                      <CopyCode code={team.join_code} />
                    </div>
                  </div>
                )}
              </Panel>
            ) : (
              <Panel className="p-7">
                <p className="label">Your team</p>
                <h2 className="mt-2 font-display text-3xl leading-none">NO TEAM YET</h2>
                <p className="mt-4 max-w-lg font-sans text-base text-muted">
                  You&apos;re registered, but you aren&apos;t on a team. Start one and
                  share the code, or enter a code someone gave you. You need a team to
                  submit.
                </p>
                <div className="mt-6">
                  <ButtonLink href="/onboarding">Sort out my team</ButtonLink>
                </div>
              </Panel>
            )}
          </div>

          {/* ---------- side column ---------- */}
          <div className="space-y-6">
            {/* submission */}
            <SubmissionForm
              submissionsOpen={SUBMISSIONS_OPEN}
              hasTeam={Boolean(team)}
              submission={submission}
              downloadUrl={downloadUrl}
            />

            {/* event flow placeholder */}
            <Panel className="p-7">
              <div className="flex items-center justify-between gap-3">
                <p className="label">Event flow</p>
                <Chip tone="orange">Coming soon</Chip>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
                    {EVENT.day1}
                  </p>
                  <p className="font-sans text-sm">{EVENT.day1Detail}</p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
                    {EVENT.day2}
                  </p>
                  <p className="font-sans text-sm">{EVENT.day2Detail}</p>
                </div>
              </div>
              <div className="mt-6 border-[3px] border-dashed border-ink p-4">
                <p className="font-sans text-sm text-muted">
                  The full hour-by-hour schedule lands here before Day 1.
                </p>
              </div>
            </Panel>

            {/* venue */}
            <Panel tone="purple" className="p-7">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-paper/80">
                Where
              </p>
              <p className="mt-3 font-display text-2xl leading-tight">{EVENT.venue}</p>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-paper/80">
                {EVENT.venueDetail}
              </p>
              <p className="mt-5 font-display text-xl">{EVENT.dates}</p>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}
