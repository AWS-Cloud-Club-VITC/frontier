"use client";

import { useActionState, useEffect, useState } from "react";
import { adminAddToTeam, adminRemoveFromTeam, adminUpdateProfile, type ActionState } from "@/app/actions";
import { Button, Field, Notice } from "@/components/ui";
import type { ParticipantRow as ParticipantRowType } from "./data-tabs";

const empty: ActionState = {};

export function ParticipantRow({
  participant,
  teams,
  shaded,
}: {
  participant: ParticipantRowType;
  teams: { id: string; name: string }[];
  shaded: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [updateState, updateAction, updating] = useActionState(adminUpdateProfile, empty);
  const [removeState, removeAction, removing] = useActionState(adminRemoveFromTeam, empty);
  const [addState, addAction, adding] = useActionState(adminAddToTeam, empty);

  useEffect(() => {
    if (updateState.ok) setEditing(false);
  }, [updateState.ok]);

  const rowClass = `border-b-[3px] border-hairline last:border-0 ${shaded ? "bg-purple-wash" : "bg-paper"}`;

  if (editing) {
    return (
      <tr className={rowClass}>
        <td colSpan={8} className="px-4 py-4">
          <form
            action={updateAction}
            className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto_auto] sm:items-end"
          >
            <input type="hidden" name="id" value={participant.id} />
            <Field label="Name" name="full_name" required defaultValue={participant.full_name ?? ""} />
            <Field label="Reg no" name="reg_no" defaultValue={participant.reg_no ?? ""} />
            <Field label="Phone" name="phone" defaultValue={participant.phone ?? ""} />
            <Field
              label="Year"
              name="year"
              type="number"
              min={1}
              max={5}
              defaultValue={participant.year ?? ""}
            />
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
    <tr className={rowClass}>
      <td className="px-4 py-3 font-sans text-sm font-bold">{participant.full_name ?? "—"}</td>
      <td className="px-4 py-3 font-mono text-xs uppercase">{participant.reg_no ?? "—"}</td>
      <td className="px-4 py-3 font-mono text-xs">{participant.email}</td>
      <td className="px-4 py-3 font-mono text-xs">{participant.phone ?? "—"}</td>
      <td className="px-4 py-3 font-mono text-xs">{participant.year ?? "—"}</td>
      <td className="px-4 py-3 font-sans text-sm">
        {participant.teamName ?? <span className="font-mono text-xs uppercase text-orange">No team</span>}
      </td>
      <td className="px-4 py-3 font-sans text-sm">{participant.track ?? "—"}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {participant.isLead && (
            <span className="border-[3px] border-ink bg-purple px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-paper">
              Lead
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-mono text-[11px] font-bold uppercase text-purple underline underline-offset-4"
          >
            Edit
          </button>

          {participant.teamName ? (
            <form action={removeAction}>
              <input type="hidden" name="id" value={participant.id} />
              {confirmingRemove ? (
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={removing}
                    className="font-mono text-[11px] font-bold uppercase text-ink underline underline-offset-4"
                  >
                    {removing ? "…" : "Confirm?"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingRemove(false)}
                    className="font-mono text-[11px] uppercase text-grey underline underline-offset-4"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingRemove(true)}
                  className="font-mono text-[11px] font-bold uppercase text-muted underline underline-offset-4 hover:text-ink"
                >
                  Remove
                </button>
              )}
            </form>
          ) : (
            <form action={addAction} className="flex items-center gap-2">
              <input type="hidden" name="id" value={participant.id} />
              <select
                name="team_id"
                required
                className="border-[3px] border-ink bg-paper px-2 py-1 font-mono text-[11px]"
                defaultValue=""
              >
                <option value="" disabled>
                  Add to team…
                </option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={adding}
                className="font-mono text-[11px] font-bold uppercase text-purple underline underline-offset-4"
              >
                {adding ? "…" : "Add"}
              </button>
            </form>
          )}
        </div>
        {(removeState.error || addState.error) && (
          <div className="mt-2 max-w-xs">
            <Notice tone="error">{removeState.error || addState.error}</Notice>
          </div>
        )}
      </td>
    </tr>
  );
}
