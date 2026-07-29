"use client";

import { useActionState, useEffect, useState } from "react";
import { adminDeleteRegistration, adminUpdateRegistration, type ActionState } from "@/app/actions";
import { Button, Field, Notice } from "@/components/ui";
import type { RegistrationRow as RegistrationRowType } from "./data-tabs";

const empty: ActionState = {};

export function RegistrationRow({ registration }: { registration: RegistrationRowType }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [updateState, updateAction, updating] = useActionState(adminUpdateRegistration, empty);
  const [deleteState, deleteAction, deleting] = useActionState(adminDeleteRegistration, empty);

  useEffect(() => {
    if (updateState.ok) setEditing(false);
  }, [updateState.ok]);

  if (editing) {
    return (
      <tr className="border-b-[3px] border-hairline last:border-0">
        <td colSpan={5} className="px-4 py-4">
          <form action={updateAction} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto_auto] sm:items-end">
            <input type="hidden" name="id" value={registration.id} />
            <Field label="Full name" name="full_name" defaultValue={registration.full_name ?? ""} />
            <Field label="Reg no" name="reg_no" defaultValue={registration.reg_no ?? ""} />
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
      <td className="px-4 py-3 font-mono text-xs">{registration.email}</td>
      <td className="px-4 py-3 font-sans text-sm">{registration.full_name ?? "—"}</td>
      <td className="px-4 py-3 font-mono text-xs uppercase">{registration.reg_no ?? "—"}</td>
      <td className="px-4 py-3 font-mono text-xs">{registration.addedByLabel}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs">{registration.created_at}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-mono text-[11px] font-bold uppercase text-purple underline underline-offset-4"
          >
            Edit
          </button>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={registration.id} />
            {confirmingDelete ? (
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={deleting}
                  className="font-mono text-[11px] font-bold uppercase text-ink underline underline-offset-4"
                >
                  {deleting ? "…" : "Confirm?"}
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
                Remove
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
