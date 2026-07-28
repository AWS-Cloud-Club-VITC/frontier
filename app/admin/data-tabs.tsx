"use client";

import { useState } from "react";
import { Panel } from "@/components/ui";

export type ParticipantRow = {
  id: string;
  full_name: string | null;
  reg_no: string | null;
  email: string;
  phone: string | null;
  year: number | null;
  teamName: string | null;
  track: string | null;
  isLead: boolean;
};

export type TeamRow = {
  id: string;
  name: string;
  track: string;
  join_code: string;
  memberCount: number;
  leaderName: string | null;
  leaderEmail: string | null;
  submission: { version: number; submitted_at: string } | null;
};

export type SubmissionRow = {
  id: string;
  teamName: string | null;
  track: string | null;
  file_name: string;
  version: number;
  submitted_at: string;
  submitterEmail: string | null;
  downloadUrl: string | null;
};

export type RegistrationRow = {
  id: string;
  email: string;
  full_name: string | null;
  reg_no: string | null;
  addedByLabel: string;
  created_at: string;
};

const TABS = ["participants", "teams", "submissions", "registrations"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL: Record<Tab, string> = {
  participants: "Participants",
  teams: "Teams",
  submissions: "Submissions",
  registrations: "Registrations",
};

/** Groups teammates together: by team name (no-team last), lead first within a team. */
function sortByTeam(participants: ParticipantRow[]) {
  return [...participants].sort((a, b) => {
    const ta = a.teamName ?? "￿";
    const tb = b.teamName ?? "￿";
    if (ta !== tb) return ta.localeCompare(tb);
    if (a.isLead !== b.isLead) return a.isLead ? -1 : 1;
    return (a.full_name ?? "").localeCompare(b.full_name ?? "");
  });
}

export function DataTabs({
  participants,
  teams,
  submissions,
  registrations,
}: {
  participants: ParticipantRow[];
  teams: TeamRow[];
  submissions: SubmissionRow[];
  registrations: RegistrationRow[];
}) {
  const [tab, setTab] = useState<Tab>("participants");

  const counts: Record<Tab, number> = {
    participants: participants.length,
    teams: teams.length,
    submissions: submissions.length,
    registrations: registrations.length,
  };

  return (
    <Panel className="mt-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[3px] border-ink bg-ink px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`border-[3px] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
                tab === t
                  ? "border-purple bg-purple text-paper"
                  : "border-paper/30 bg-transparent text-paper/70 hover:border-paper hover:text-paper"
              }`}
            >
              {TAB_LABEL[t]} · {counts[t]}
            </button>
          ))}
        </div>
        <a
          href={`/admin/export?dataset=${tab}`}
          className="border-[3px] border-paper bg-transparent px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-paper transition-colors hover:bg-paper hover:text-ink"
        >
          Download CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        {tab === "participants" && (
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b-[3px] border-ink bg-purple-wash">
                {["Name", "Reg no", "Email", "Phone", "Year", "Team", "Track", "Role"].map((h) => (
                  <th key={h} className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                let lastTeam: string | null | undefined;
                let shade = false;
                return sortByTeam(participants).map((r) => {
                  if (r.teamName !== lastTeam) {
                    shade = !shade;
                    lastTeam = r.teamName;
                  }
                  return (
                    <tr
                      key={r.id}
                      className={`border-b-[3px] border-hairline last:border-0 ${
                        shade ? "bg-purple-wash" : "bg-paper"
                      }`}
                    >
                      <td className="px-4 py-3 font-sans text-sm font-bold">{r.full_name ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs uppercase">{r.reg_no ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.email}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.phone ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.year ?? "—"}</td>
                      <td className="px-4 py-3 font-sans text-sm">
                        {r.teamName ?? <span className="font-mono text-xs uppercase text-orange">No team</span>}
                      </td>
                      <td className="px-4 py-3 font-sans text-sm">{r.track ?? "—"}</td>
                      <td className="px-4 py-3">
                        {r.isLead ? (
                          <span className="border-[3px] border-ink bg-purple px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-paper">
                            Lead
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                });
              })()}
              {participants.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center font-sans text-muted">
                    No registrations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "teams" && (
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b-[3px] border-ink bg-purple-wash">
                {["Team", "Track", "Join code", "Members", "Lead", "Submission"].map((h) => (
                  <th key={h} className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id} className="border-b-[3px] border-hairline last:border-0">
                  <td className="px-4 py-3 font-sans text-sm font-bold">{t.name}</td>
                  <td className="px-4 py-3 font-sans text-sm">{t.track}</td>
                  <td className="px-4 py-3 font-mono text-xs uppercase">{t.join_code}</td>
                  <td className="px-4 py-3 font-mono text-xs">{t.memberCount}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {t.leaderName ?? "—"}
                    {t.leaderEmail && <span className="block text-muted">{t.leaderEmail}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {t.submission ? (
                      <span className="text-purple">v{t.submission.version}</span>
                    ) : (
                      <span className="text-muted">Not submitted</span>
                    )}
                  </td>
                </tr>
              ))}
              {teams.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center font-sans text-muted">
                    No teams yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "submissions" && (
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b-[3px] border-ink bg-purple-wash">
                {["Team", "Track", "File", "Version", "Submitted by", "Submitted at", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} className="border-b-[3px] border-hairline last:border-0">
                  <td className="px-4 py-3 font-sans text-sm font-bold">{s.teamName ?? "—"}</td>
                  <td className="px-4 py-3 font-sans text-sm">{s.track ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.file_name}</td>
                  <td className="px-4 py-3 font-mono text-xs">v{s.version}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.submitterEmail ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.submitted_at}</td>
                  <td className="px-4 py-3">
                    {s.downloadUrl && (
                      <a
                        href={s.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[11px] font-bold uppercase text-purple underline underline-offset-4"
                      >
                        Download
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center font-sans text-muted">
                    No submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "registrations" && (
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b-[3px] border-ink bg-purple-wash">
                {["Email", "Full name", "Reg no", "Added by", "Added at"].map((h) => (
                  <th key={h} className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <tr key={r.id} className="border-b-[3px] border-hairline last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{r.email}</td>
                  <td className="px-4 py-3 font-sans text-sm">{r.full_name ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs uppercase">{r.reg_no ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.addedByLabel}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.created_at}</td>
                </tr>
              ))}
              {registrations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center font-sans text-muted">
                    No registrations imported yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  );
}
