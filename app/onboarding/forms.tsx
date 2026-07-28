"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createTeam, joinTeam, saveProfile, type ActionState } from "@/app/actions";
import { Button, Field, Notice, Panel, Select } from "@/components/ui";
import { MAX_TEAM_SIZE, TRACKS } from "@/lib/constants";

const empty: ActionState = {};

export function ProfileForm({
  defaults,
}: {
  defaults: { full_name: string; reg_no: string; phone: string; year: string };
}) {
  const [state, action, pending] = useActionState(saveProfile, empty);

  return (
    <form action={action} className="space-y-5">
      <Field
        label="Full name"
        name="full_name"
        required
        defaultValue={defaults.full_name}
        placeholder="As it appears on your ID card"
      />
      <Field
        label="Registration number"
        name="reg_no"
        required
        defaultValue={defaults.reg_no}
        placeholder="23BCE1234"
        className="uppercase"
        hint="Used on the certificate — get it right."
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Phone"
          name="phone"
          inputMode="numeric"
          defaultValue={defaults.phone}
          placeholder="10 digits"
          hint="For event-day updates."
        />
        <Select label="Year of study" name="year" defaultValue={defaults.year}>
          <option value="">Select…</option>
          <option value="1">1st year</option>
          <option value="2">2nd year</option>
          <option value="3">3rd year</option>
          <option value="4">4th year</option>
          <option value="5">5th year</option>
        </Select>
      </div>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save & continue"}
      </Button>
    </form>
  );
}

export function TeamFork() {
  const [choice, setChoice] = useState<null | "create" | "join">(null);

  if (choice === null) {
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        <button
          onClick={() => setChoice("create")}
          className="border-[3px] border-ink bg-paper p-7 text-left shadow-brut transition-all duration-100 hover:translate-x-[6px] hover:translate-y-[6px] hover:shadow-none"
        >
          <div className="flex h-10 w-10 items-center justify-center border-[3px] border-ink bg-purple font-mono text-sm font-bold text-paper">
            01
          </div>
          <h3 className="mt-5 font-display text-2xl">START A TEAM</h3>
          <p className="mt-3 font-sans text-sm text-muted">
            You become the team lead. You&apos;ll get a join code to share with the
            others — they can join whenever they register.
          </p>
        </button>

        <button
          onClick={() => setChoice("join")}
          className="border-[3px] border-ink bg-paper p-7 text-left shadow-brut transition-all duration-100 hover:translate-x-[6px] hover:translate-y-[6px] hover:shadow-none"
        >
          <div className="flex h-10 w-10 items-center justify-center border-[3px] border-ink bg-ink font-mono text-sm font-bold text-paper">
            02
          </div>
          <h3 className="mt-5 font-display text-2xl">JOIN A TEAM</h3>
          <p className="mt-3 font-sans text-sm text-muted">
            Already have a 6-character code from your team lead? Enter it here.
          </p>
        </button>

        <div className="sm:col-span-2">
          <Link
            href="/dashboard"
            className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted underline underline-offset-4 hover:text-purple"
          >
            Skip for now — I&apos;ll sort my team out later
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => setChoice(null)}
        className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted underline underline-offset-4 hover:text-purple"
      >
        ← Back
      </button>
      {choice === "create" ? <CreateTeamForm /> : <JoinTeamForm />}
    </div>
  );
}

export function CreateTeamForm() {
  const [state, action, pending] = useActionState(createTeam, empty);

  return (
    <Panel className="p-6 sm:p-8">
      <h3 className="font-display text-2xl">START A TEAM</h3>
      <p className="mt-2 font-sans text-sm text-muted">
        Teams are 1 to {MAX_TEAM_SIZE} people. You can add the others now or later.
      </p>

      <form action={action} className="mt-6 space-y-5">
        <Field
          label="Team name"
          name="name"
          required
          maxLength={40}
          placeholder="Something you'd be happy to hear announced"
        />
        <Select label="Track" name="track" required defaultValue="">
          <option value="" disabled>
            Select a track…
          </option>
          {TRACKS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        {state.error && <Notice tone="error">{state.error}</Notice>}
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create team"}
        </Button>
      </form>
    </Panel>
  );
}

export function JoinTeamForm() {
  const [state, action, pending] = useActionState(joinTeam, empty);
  const [code, setCode] = useState("");

  return (
    <Panel className="p-6 sm:p-8">
      <h3 className="font-display text-2xl">JOIN A TEAM</h3>
      <p className="mt-2 font-sans text-sm text-muted">
        Ask your team lead for the code on their dashboard.
      </p>

      <form action={action} className="mt-6 space-y-5">
        <Field
          label="Join code"
          name="code"
          required
          maxLength={6}
          placeholder="ABC123"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
          }
          className="text-center font-mono text-2xl tracking-[0.4em]"
        />

        {state.error && <Notice tone="error">{state.error}</Notice>}
        <Button type="submit" disabled={pending || code.length < 6}>
          {pending ? "Joining…" : "Join team"}
        </Button>
      </form>
    </Panel>
  );
}
