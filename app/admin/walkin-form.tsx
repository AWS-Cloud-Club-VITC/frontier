"use client";

import { useActionState } from "react";
import { addWalkinRegistration, type ActionState } from "@/app/actions";
import { Button, Field, Notice } from "@/components/ui";

const empty: ActionState = {};

export function WalkinForm() {
  const [state, action, pending] = useActionState(addWalkinRegistration, empty);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end">
      <Field
        label="Email"
        name="email"
        type="email"
        required
        placeholder="name.2023@vitstudent.ac.in"
      />
      <Field label="Full name (optional)" name="full_name" placeholder="As on their ID" />
      <Field label="Reg no (optional)" name="reg_no" placeholder="23BCE1234" />
      <Button type="submit" variant="dark" disabled={pending}>
        {pending ? "Adding…" : "Add & allow sign-in"}
      </Button>
      {state.error && (
        <div className="sm:col-span-4">
          <Notice tone="error">{state.error}</Notice>
        </div>
      )}
      {state.ok && (
        <div className="sm:col-span-4">
          <Notice tone="ok">{state.ok}</Notice>
        </div>
      )}
    </form>
  );
}
