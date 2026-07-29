"use client";

import { useState } from "react";
import { Panel } from "@/components/ui";
import { ParticipantRow } from "./participant-row";
import { TeamRow } from "./team-row";
import { RegistrationRow } from "./registration-row";
import { SubmissionRow } from "./submission-row";

import { withBasePath } from "@/lib/base-path";

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
  leader_id: string;
  leaderName: string | null;
  leaderEmail: string | null;
  members: { id: string; full_name: string | null }[];
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
          href={withBasePath(`/admin/export?dataset=${tab}`)}
          download
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
                {["Name", "Reg no", "Email", "Phone", "Year", "Team", "Track", "Role / actions"].map((h) => (
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
                    <ParticipantRow
                      key={r.id}
                      participant={r}
                      teams={teams}
                      shaded={shade}
                    />
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
                {["Team", "Track", "Join code", "Members", "Lead", "Submission / actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <TeamRow key={t.id} team={t} />
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
                {["Team", "Track", "File", "Version", "Submitted by", "Submitted at", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <SubmissionRow key={s.id} submission={s} />
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
                {["Email", "Full name", "Reg no", "Added by", "Added at / actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <RegistrationRow key={r.id} registration={r} />
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
