"use client";

import { useActionState } from "react";
import {
  addMember,
  removeMember,
  transferLead,
  updateTeam,
  type ActionState,
} from "@/app/actions";
import { Button, Field, Notice, Select } from "@/components/ui";
import { TRACKS } from "@/lib/constants";
import type { Member } from "@/lib/data";

const empty: ActionState = {};

export function TeamSettingsForm({
  name,
  track,
}: {
  name: string;
  track: string;
}) {
  const [state, action, pending] = useActionState(updateTeam, empty);

  return (
    <form action={action} className="space-y-5">
      <Field label="Team name" name="name" required maxLength={40} defaultValue={name} />
      <Select label="Track" name="track" required defaultValue={track}>
        {TRACKS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </Select>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="ok">{state.ok}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

export function AddMemberForm({ full }: { full: boolean }) {
  const [state, action, pending] = useActionState(addMember, empty);

  return (
    <form action={action} className="space-y-5">
      <Field
        label="Their VIT email"
        name="email"
        type="email"
        required
        disabled={full}
        placeholder="teammate@vitstudent.ac.in"
        hint={
          full
            ? "Your team is full."
            : "Only works if they have already registered and filled in their details. If they haven't, send them your join code instead."
        }
      />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="ok">{state.ok}</Notice>}
      <Button type="submit" variant="dark" disabled={pending || full}>
        {pending ? "Adding…" : "Add to team"}
      </Button>
    </form>
  );
}

export function MemberRow({
  member,
  isLeader,
}: {
  member: Member;
  isLeader: boolean;
}) {
  const [removeState, removeAction, removing] = useActionState(removeMember, empty);
  const [transferState, transferAction, transferring] = useActionState(
    transferLead,
    empty
  );

  return (
    <li className="bg-paper px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-sans text-base font-bold">{member.full_name}</p>
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
            {member.reg_no} · {member.email}
          </p>
        </div>

        {isLeader ? (
          <span className="border-[3px] border-ink bg-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-paper">
            Lead
          </span>
        ) : (
          <div className="flex flex-wrap gap-2">
            <form action={transferAction}>
              <input type="hidden" name="member_id" value={member.id} />
              <button
                type="submit"
                disabled={transferring}
                className="border-[3px] border-ink bg-paper px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition-all duration-100 hover:bg-purple hover:text-paper disabled:opacity-50"
              >
                {transferring ? "…" : "Make lead"}
              </button>
            </form>
            <form action={removeAction}>
              <input type="hidden" name="member_id" value={member.id} />
              <button
                type="submit"
                disabled={removing}
                className="border-[3px] border-ink bg-paper px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition-all duration-100 hover:bg-ink hover:text-paper disabled:opacity-50"
              >
                {removing ? "…" : "Remove"}
              </button>
            </form>
          </div>
        )}
      </div>

      {(removeState.error || transferState.error) && (
        <div className="mt-3">
          <Notice tone="error">{removeState.error || transferState.error}</Notice>
        </div>
      )}
    </li>
  );
}
