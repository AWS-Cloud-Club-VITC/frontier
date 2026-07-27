import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data";
import { AppHeader } from "@/components/app-header";
import { Chip, Panel } from "@/components/ui";
import { TRACKS } from "@/lib/constants";

export const metadata = { title: "Organisers · FRONTIER 2026" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  full_name: string | null;
  reg_no: string | null;
  email: string;
  phone: string | null;
  year: number | null;
  team_id: string | null;
  teams: { id: string; name: string; track: string; leader_id: string } | null;
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
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, reg_no, email, phone, year, team_id, teams(id, name, track, leader_id)")
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as unknown as Row[];
  const registered = rows.length;
  const completed = rows.filter((r) => r.full_name && r.reg_no).length;
  const teamed = rows.filter((r) => r.team_id).length;
  const teamCount = new Set(rows.filter((r) => r.team_id).map((r) => r.team_id)).size;

  const perTrack = TRACKS.map((t) => ({
    track: t,
    teams: new Set(
      rows.filter((r) => r.teams?.track === t).map((r) => r.team_id)
    ).size,
  }));

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
          <a
            href="/admin/export"
            className="inline-flex items-center border-[3px] border-ink bg-purple px-6 py-3 font-sans text-sm font-bold uppercase tracking-wide text-paper shadow-brut-sm transition-all duration-100 hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
          >
            Download CSV
          </a>
        </div>

        {/* stats */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
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
        <Panel className="mt-6 p-6">
          <p className="label-muted">Teams per track</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {perTrack.map((t) => (
              <div
                key={t.track}
                className="flex items-center gap-3 border-[3px] border-ink px-4 py-2"
              >
                <span className="font-sans text-sm font-bold">{t.track}</span>
                <span className="border-[3px] border-ink bg-ink px-2 py-0.5 font-mono text-xs font-bold text-paper">
                  {t.teams}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        {/* table */}
        <Panel className="mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b-[3px] border-ink bg-ink text-paper">
                  {["Name", "Reg no", "Email", "Phone", "Year", "Team", "Track", "Role"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em]"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b-[3px] border-hairline last:border-0">
                    <td className="px-4 py-3 font-sans text-sm font-bold">
                      {r.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs uppercase">
                      {r.reg_no ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.email}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.phone ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.year ?? "—"}</td>
                    <td className="px-4 py-3 font-sans text-sm">
                      {r.teams?.name ?? (
                        <span className="font-mono text-xs uppercase text-orange">
                          No team
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm">{r.teams?.track ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.teams?.leader_id === r.id ? (
                        <span className="border-[3px] border-ink bg-purple px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-paper">
                          Lead
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center font-sans text-muted">
                      No registrations yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </main>
    </div>
  );
}
