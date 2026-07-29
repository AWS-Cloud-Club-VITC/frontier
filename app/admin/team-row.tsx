"use client";

import { useActionState, useEffect, useState } from "react";
import { adminDeleteTeam, adminTransferLead, adminUpdateTeam, type ActionState } from "@/app/actions";
import { Button, Field, Notice, Select } from "@/components/ui";
import { TRACKS } from "@/lib/constants";
import type { TeamRow as TeamRowType } from "./data-tabs";

const empty: ActionState = {};

export function TeamRow({ team }: { team: TeamRowType }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [updateState, updateAction, updating] = useActionState(adminUpdateTeam, empty);
  const [transferState, transferAction, transferring] = useActionState(adminTransferLead, empty);
  const [deleteState, deleteAction, deleting] = useActionState(adminDeleteTeam, empty);

  useEffect(() => {
    if (updateState.ok) setEditing(false);
  }, [updateState.ok]);

  const otherMembers = team.members.filter((m) => m.id !== team.leader_id);

  if (editing) {
    return (
      <tr className="border-b-[3px] border-hairline last:border-0">
        <td colSpan={6} className="px-4 py-4">
          <form action={updateAction} className="grid gap-3 sm:grid-cols-[2fr_2fr_auto_auto] sm:items-end">
            <input type="hidden" name="team_id" value={team.id} />
            <Field label="Team name" name="name" required maxLength={40} defaultValue={team.name} />
            <Select label="Track" name="track" required defaultValue={team.track}>
              {TRACKS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Button type="submit" disabled={updating} className="h-fit">
              {updating ? "Saving…" : "Save"}
            </Button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="font-mono text-xs uppercase underline text-grey hover:text-paper"
            >
              Cancel
            </button>
          </form>
          {updateState.error && (
            <div className="mt-3">
              <Notice tone="error">{updateState.error}</Notice>
            </div>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b-[3px] border-hairline last:border-0">
      <td className="px-4 py-3 font-sans text-sm font-bold">{team.name}</td>
      <td className="px-4 py-3 font-sans text-sm">{team.track}</td>
      <td className="px-4 py-3 font-mono text-xs uppercase">{team.join_code}</td>
      <td className="px-4 py-3 font-mono text-xs">{team.memberCount}</td>
      <td className="px-4 py-3 font-mono text-xs">
        {team.leaderName ?? "—"}
        {team.leaderEmail && <span className="block text-muted">{team.leaderEmail}</span>}
        {otherMembers.length > 0 && (
          <form action={transferAction} className="mt-2 flex items-center gap-1.5">
            <input type="hidden" name="team_id" value={team.id} />
            <select
              name="new_leader_id"
              required
              defaultValue=""
              className="border-[3px] border-ink bg-paper px-1.5 py-1 font-mono text-[10px]"
            >
              <option value="" disabled>
                Make lead…
              </option>
              {otherMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name ?? "Unnamed"}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={transferring}
              className="font-mono text-[10px] font-bold uppercase text-purple underline underline-offset-4"
            >
              {transferring ? "…" : "Go"}
            </button>
          </form>
        )}
        {transferState.error && (
          <div className="mt-2 max-w-xs">
            <Notice tone="error">{transferState.error}</Notice>
          </div>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-xs">
        {team.submission ? (
          <span className="text-purple">v{team.submission.version}</span>
        ) : (
          <span className="text-muted">Not submitted</span>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-mono text-[11px] font-bold uppercase text-purple underline underline-offset-4"
          >
            Edit
          </button>
          <form action={deleteAction}>
            <input type="hidden" name="team_id" value={team.id} />
            {confirmingDelete ? (
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={deleting}
                  className="font-mono text-[11px] font-bold uppercase text-ink underline underline-offset-4"
                >
                  {deleting ? "…" : "Confirm delete?"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="font-mono text-[11px] uppercase text-grey underline underline-offset-4"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="font-mono text-[11px] font-bold uppercase text-muted underline underline-offset-4 hover:text-ink"
              >
                Delete team
              </button>
            )}
          </form>
        </div>
        {deleteState.error && (
          <div className="mt-2 max-w-xs">
            <Notice tone="error">{deleteState.error}</Notice>
          </div>
        )}
      </td>
    </tr>
  );
}
