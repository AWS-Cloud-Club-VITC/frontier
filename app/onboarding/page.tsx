import { redirect } from "next/navigation";
import { getProfile, profileIsComplete } from "@/lib/data";
import { withBasePath } from "@/lib/base-path";
import { ProfileForm, TeamFork } from "./forms";
import { AppHeader } from "@/components/app-header";
import { Chip, Panel } from "@/components/ui";

export const metadata = { title: "Get set up · FRONTIER 2026" };

export default async function OnboardingPage() {
  const profile = await getProfile();
  if (!profile) redirect(withBasePath("/login"));

  const complete = profileIsComplete(profile);
  if (complete && profile.team_id) redirect(withBasePath("/dashboard"));

  const stepNumber = complete ? 2 : 1;

  return (
    <div className="min-h-screen bg-purple-wash">
      <AppHeader email={profile.email} />

      <main className="mx-auto max-w-3xl px-5 py-12">
        {/* step rail */}
        <div className="flex items-center gap-3">
          {[1, 2].map((n) => (
            <div key={n} className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center border-[3px] border-ink font-mono text-xs font-bold ${
                  n <= stepNumber ? "bg-purple text-paper" : "bg-paper text-muted"
                }`}
              >
                0{n}
              </div>
              {n === 1 && <div className="h-[3px] w-10 bg-ink" />}
            </div>
          ))}
          <span className="label ml-2">
            {stepNumber === 1 ? "Your details" : "Your team"}
          </span>
        </div>

        {stepNumber === 1 ? (
          <>
            <h1 className="mt-8 font-display text-4xl leading-none sm:text-5xl">
              YOUR DETAILS
            </h1>
            <p className="mt-4 max-w-xl font-sans text-base text-muted">
              This is what goes on the participant list and your certificate. Takes a
              minute.
            </p>
            <Panel className="mt-8 p-6 sm:p-8">
              <ProfileForm
                defaults={{
                  full_name: profile.full_name ?? "",
                  reg_no: profile.reg_no ?? "",
                  phone: profile.phone ?? "",
                  year: profile.year ? String(profile.year) : "",
                }}
              />
            </Panel>
          </>
        ) : (
          <>
            <div className="mt-8">
              <Chip tone="purple">Details saved</Chip>
            </div>
            <h1 className="mt-5 font-display text-4xl leading-none sm:text-5xl">
              DO YOU HAVE A TEAM?
            </h1>
            <p className="mt-4 max-w-xl font-sans text-base text-muted">
              One person starts the team and shares the code. Everyone else joins with
              it. Solo entries are fine — start a team on your own.
            </p>
            <div className="mt-8">
              <TeamFork />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
