import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile, getTeam, profileIsComplete } from "@/lib/data";
import { withBasePath } from "@/lib/base-path";
import { AppHeader } from "@/components/app-header";
import { CopyCode } from "@/components/copy-code";
import { Chip, Notice, Panel } from "@/components/ui";
import { AddMemberForm, MemberRow, TeamSettingsForm } from "./manage-forms";
import { leaveTeam } from "@/app/actions";
import { MAX_TEAM_SIZE } from "@/lib/constants";

export const metadata = { title: "Manage team · FRONTIER 2026" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await getProfile();
  if (!profile) redirect(withBasePath("/login"));
  if (!profileIsComplete(profile)) redirect(withBasePath("/onboarding"));
  if (!profile.team_id) redirect(withBasePath("/dashboard"));

  const { team, members } = await getTeam(profile.team_id);
  if (!team) redirect(withBasePath("/dashboard"));

  const isLead = team.leader_id === profile.id;
  if (!isLead) redirect(withBasePath("/dashboard"));

  const full = members.length >= MAX_TEAM_SIZE;

  return (
    <div className="min-h-screen bg-purple-wash">
      <AppHeader email={profile.email} isAdmin={profile.role === "admin"} />

      <main className="mx-auto max-w-4xl px-5 py-12">
        <Link
          href="/dashboard"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted underline underline-offset-4 hover:text-purple"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label">Managing</p>
            <h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl">
              {team.name.toUpperCase()}
            </h1>
          </div>
          <Chip tone="purple">{team.track}</Chip>
        </div>

        {error && (
          <div className="mt-6">
            <Notice tone="error">{error}</Notice>
          </div>
        )}

        <div className="mt-10 space-y-6">
          {/* roster */}
          <Panel className="p-7">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl">
                MEMBERS · {members.length}/{MAX_TEAM_SIZE}
              </h2>
            </div>
            <ul className="mt-5 divide-y-[3px] divide-ink border-[3px] border-ink">
              {members.map((m) => (
                <MemberRow key={m.id} member={m} isLeader={m.id === team.leader_id} />
              ))}
            </ul>
          </Panel>

          {/* join code */}
          <Panel tone="ink" className="p-7">
            <p className="label !text-purple-dim">Join code</p>
            <h2 className="mt-3 font-display text-2xl">THE EASY WAY TO ADD PEOPLE</h2>
            <p className="mt-3 max-w-lg font-sans text-sm text-grey">
              Send this code to your teammates. Once they register with their VIT email
              they enter it themselves and land on your team — no action needed from you.
            </p>
            <div className="mt-5">
              <CopyCode code={team.join_code} />
            </div>
            {full && (
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-orange">
                Team is full — the code will be rejected until you remove someone.
              </p>
            )}
          </Panel>

          {/* add by email */}
          <Panel className="p-7">
            <h2 className="font-display text-2xl">ADD A REGISTERED TEAMMATE</h2>
            <p className="mt-3 max-w-lg font-sans text-sm text-muted">
              For people who have already signed up and filled in their details.
            </p>
            <div className="mt-6">
              <AddMemberForm full={full} />
            </div>
          </Panel>

          {/* settings */}
          <Panel className="p-7">
            <h2 className="font-display text-2xl">TEAM SETTINGS</h2>
            <div className="mt-6">
              <TeamSettingsForm name={team.name} track={team.track} />
            </div>
          </Panel>

          {/* leave */}
          <Panel className="p-7">
            <h2 className="font-display text-2xl">LEAVE THIS TEAM</h2>
            <p className="mt-3 max-w-lg font-sans text-sm text-muted">
              {members.length > 1
                ? "You're the lead. Hand the lead to someone else before you leave."
                : "You're the only member, so the team will be deleted."}
            </p>
            <form action={leaveTeam} className="mt-6">
              <button
                type="submit"
                disabled={members.length > 1}
                className="border-[3px] border-ink bg-paper px-6 py-3 font-sans text-sm font-bold uppercase tracking-wide shadow-brut-sm transition-all duration-100 hover:translate-x-[4px] hover:translate-y-[4px] hover:bg-ink hover:text-paper hover:shadow-none disabled:pointer-events-none disabled:opacity-40"
              >
                Leave team
              </button>
            </form>
          </Panel>
        </div>
      </main>
    </div>
  );
}
