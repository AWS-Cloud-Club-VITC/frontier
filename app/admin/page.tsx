import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSubmissionDownloadUrl } from "@/lib/data";
import { AppHeader } from "@/components/app-header";
import { Chip, Panel } from "@/components/ui";
import { ATTENDANCE_SESSIONS, TRACKS, TRACK_PPTS, type AttendanceSession } from "@/lib/constants";
import { WalkinForm } from "./walkin-form";
import {
  DataTabs,
  type AttendanceRow,
  type ParticipantRow,
  type RegistrationRow,
  type SubmissionRow,
  type TeamRow,
} from "./data-tabs";

export const metadata = { title: "Organisers · FRONTIER 2026" };
export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  full_name: string | null;
  reg_no: string | null;
  email: string;
  phone: string | null;
  year: number | null;
  team_id: string | null;
  teams: { id: string; name: string; track: string; join_code: string; leader_id: string } | null;
};

type SubmissionQueryRow = {
  id: string;
  team_id: string;
  file_name: string;
  file_path: string;
  version: number;
  submitted_by: string | null;
  submitted_at: string;
  teams: { name: string; track: string } | null;
};

type RegistrationQueryRow = {
  id: string;
  email: string;
  full_name: string | null;
  reg_no: string | null;
  added_by: string | null;
  created_at: string;
};

type AttendanceQueryRow = {
  registration_id: string;
  session: AttendanceSession;
  present: boolean;
};

export default async function AdminPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  if (profile.role !== "admin") {
    return (
      <div className="min-h-screen bg-purple-wash">
        <AppHeader email={profile.email} />
        <main className="mx-auto max-w-2xl px-5 py-20">
          <Panel className="p-8">
            <Chip tone="orange">Restricted</Chip>
            <h1 className="mt-5 font-display text-3xl">ORGANISERS ONLY</h1>
            <p className="mt-4 font-sans text-base text-muted">
              This page is for the FRONTIER organising team. If that&apos;s you, ask for
              your account to be given the admin role.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted underline underline-offset-4 hover:text-purple"
            >
              ← Back to my dashboard
            </Link>
          </Panel>
        </main>
      </div>
    );
  }

  const supabase = await createClient();
  const [
    { data: profilesData },
    { data: submissionsData },
    { data: registrationsData },
    { data: attendanceData },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, reg_no, email, phone, year, team_id, teams(id, name, track, join_code, leader_id)"
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("submissions")
      .select("id, team_id, file_name, file_path, version, submitted_by, submitted_at, teams(name, track)")
      .order("submitted_at", { ascending: true }),
    supabase
      .from("registrations")
      .select("id, email, full_name, reg_no, added_by, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("attendance").select("registration_id, session, present"),
  ]);

  const rows = (profilesData ?? []) as unknown as ProfileRow[];
  const submissionRows = (submissionsData ?? []) as unknown as SubmissionQueryRow[];
  const registrationRows = (registrationsData ?? []) as unknown as RegistrationQueryRow[];
  const attendanceRows = (attendanceData ?? []) as unknown as AttendanceQueryRow[];

  const registered = rows.length;
  const completed = rows.filter((r) => r.full_name && r.reg_no).length;
  const teamed = rows.filter((r) => r.team_id).length;
  const teamCount = new Set(rows.filter((r) => r.team_id).map((r) => r.team_id)).size;

  const perTrack = TRACKS.map((t) => ({
    track: t,
    teams: new Set(rows.filter((r) => r.teams?.track === t).map((r) => r.team_id)).size,
  }));

  // ---- participants tab ----
  const participants: ParticipantRow[] = rows.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    reg_no: r.reg_no,
    email: r.email,
    phone: r.phone,
    year: r.year,
    teamName: r.teams?.name ?? null,
    track: r.teams?.track ?? null,
    isLead: r.teams?.leader_id === r.id,
  }));

  // ---- teams tab ----
  const submissionByTeam = new Map(
    submissionRows.map((s) => [s.team_id, { version: s.version, submitted_at: s.submitted_at }])
  );
  const teamMap = new Map<string, TeamRow>();
  for (const r of rows) {
    if (!r.teams) continue;
    const t = r.teams;
    if (!teamMap.has(t.id)) {
      teamMap.set(t.id, {
        id: t.id,
        name: t.name,
        track: t.track,
        join_code: t.join_code,
        memberCount: 0,
        leader_id: t.leader_id,
        leaderName: null,
        leaderEmail: null,
        members: [],
        submission: submissionByTeam.get(t.id) ?? null,
      });
    }
    const agg = teamMap.get(t.id)!;
    agg.memberCount += 1;
    agg.members.push({ id: r.id, full_name: r.full_name });
    if (r.id === t.leader_id) {
      agg.leaderName = r.full_name;
      agg.leaderEmail = r.email;
    }
  }
  const teams = [...teamMap.values()];

  // ---- submissions tab ----
  const profileById = new Map(rows.map((r) => [r.id, r]));
  const submissions: SubmissionRow[] = await Promise.all(
    submissionRows.map(async (s) => ({
      id: s.id,
      teamName: s.teams?.name ?? null,
      track: s.teams?.track ?? null,
      file_name: s.file_name,
      version: s.version,
      submitted_at: s.submitted_at,
      submitterEmail: s.submitted_by ? profileById.get(s.submitted_by)?.email ?? null : null,
      downloadUrl: await getSubmissionDownloadUrl(s.file_path),
    }))
  );

  // ---- registrations tab ----
  const registrations: RegistrationRow[] = registrationRows.map((r) => ({
    id: r.id,
    email: r.email,
    full_name: r.full_name,
    reg_no: r.reg_no,
    addedByLabel: r.added_by ? profileById.get(r.added_by)?.email ?? "reg desk" : "Excel import",
    created_at: r.created_at,
  }));

  // ---- attendance tab ----
  const attendanceByRegistration = new Map<string, Partial<Record<AttendanceSession, boolean>>>();
  for (const a of attendanceRows) {
    if (!attendanceByRegistration.has(a.registration_id)) {
      attendanceByRegistration.set(a.registration_id, {});
    }
    attendanceByRegistration.get(a.registration_id)![a.session] = a.present;
  }
  const attendance: AttendanceRow[] = registrationRows.map((r) => {
    const marked = attendanceByRegistration.get(r.id) ?? {};
    const sessions = Object.fromEntries(
      ATTENDANCE_SESSIONS.map((s) => [s.key, marked[s.key] ?? false])
    ) as Record<AttendanceSession, boolean>;
    return {
      registrationId: r.id,
      email: r.email,
      full_name: r.full_name,
      reg_no: r.reg_no,
      sessions,
    };
  });

  return (
    <div className="min-h-screen bg-purple-wash">
      <AppHeader email={profile.email} isAdmin />

      <main className="mx-auto max-w-7xl px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label">Organisers</p>
            <h1 className="mt-2 font-display text-4xl leading-none sm:text-5xl">
              REGISTRATIONS
            </h1>
          </div>
        </div>

        {/* stats */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "On allowlist", value: registrationRows.length },
            { label: "Accounts", value: registered },
            { label: "Details filled", value: completed },
            { label: "On a team", value: teamed },
            { label: "Teams", value: teamCount },
          ].map((s) => (
            <Panel key={s.label} className="p-6">
              <p className="label-muted">{s.label}</p>
              <p className="mt-3 font-display text-4xl">{s.value}</p>
            </Panel>
          ))}
        </div>

        {/* per track */}
        <div className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
            <div>
              <p className="label-muted">Tracks & Resources</p>
              <h2 className="font-display text-2xl sm:text-3xl mt-1">FIVE TRACKS</h2>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {perTrack.map((t, i) => (
              <div
                key={t.track}
                className="border-[3px] border-ink bg-paper p-6 shadow-brut flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center border-[3px] border-ink bg-ink font-mono text-sm font-bold text-paper">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <h3 className="font-display text-lg sm:text-xl leading-tight uppercase">
                        {t.track}
                      </h3>
                    </div>
                    <span className="shrink-0 border-[3px] border-ink bg-ink px-2.5 py-1 font-mono text-xs font-bold text-paper">
                      {t.teams} {t.teams === 1 ? "team" : "teams"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t-[2px] border-ink/15 flex items-center justify-between">
                  <a
                    href={`/api/ppts/${encodeURIComponent(TRACK_PPTS[t.track as keyof typeof TRACK_PPTS])}`}
                    download
                    className="inline-flex items-center gap-2 border-[3px] border-ink bg-purple px-4 py-2 font-sans text-xs font-bold uppercase tracking-wide text-paper shadow-brut-sm transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                  >
                    <svg
                      className="h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    <span>Download PPT</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* walk-in registration */}
        <Panel className="mt-6 p-6">
          <p className="label-muted">Reg desk — add a walk-in</p>
          <p className="mt-2 font-sans text-sm text-muted">
            Not on the pre-registration list? Add their email here and they can sign in
            right away.
          </p>
          <div className="mt-4">
            <WalkinForm />
          </div>
        </Panel>

        {/* unified data portal */}
        <DataTabs
          participants={participants}
          teams={teams}
          submissions={submissions}
          registrations={registrations}
          attendance={attendance}
        />
      </main>
    </div>
  );
}
