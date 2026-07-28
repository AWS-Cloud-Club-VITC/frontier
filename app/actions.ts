"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TRACKS } from "@/lib/constants";

export type ActionState = { error?: string; ok?: string };

/** Trims a form value to a string, or "" when absent. */
function str(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

/** Postgres RAISE messages arrive with noise attached — strip it for display. */
function clean(message: string) {
  return message.replace(/^.*?(?:ERROR|error):\s*/i, "").trim() || "Something went wrong.";
}

export async function saveProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are signed out. Sign in again." };

  const full_name = str(formData.get("full_name"));
  const reg_no = str(formData.get("reg_no")).toUpperCase();
  const phone = str(formData.get("phone"));
  const yearRaw = str(formData.get("year"));

  if (full_name.length < 2) return { error: "Enter your full name." };
  if (!/^[0-9]{2}[A-Z]{3}[0-9]{4}$/.test(reg_no)) {
    return { error: "Registration number should look like 23BCE1234." };
  }
  if (phone && !/^[0-9]{10}$/.test(phone)) {
    return { error: "Phone number should be 10 digits, no spaces." };
  }

  const year = yearRaw ? Number(yearRaw) : null;

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email?.toLowerCase() ?? "",
        full_name,
        reg_no,
        phone: phone || null,
        year,
      },
      { onConflict: "id" }
    );

  if (error) {
    console.error("[Action] saveProfile error:", error);
    if (error.code === "23505") {
      return { error: "That registration number is already registered." };
    }
    return { error: clean(error.message) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  return { ok: "Profile saved." };
}

export async function createTeam(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const name = str(formData.get("name"));
  const track = str(formData.get("track"));

  if (name.length < 2) return { error: "Give your team a name." };
  if (name.length > 40) return { error: "Team name is too long — 40 characters max." };
  if (!TRACKS.includes(track as (typeof TRACKS)[number])) {
    return { error: "Pick one of the five tracks." };
  }

  const { error } = await supabase.rpc("create_team", {
    p_name: name,
    p_track: track,
  });

  if (error) {
    console.error("[Action] createTeam error:", error);
    if (error.code === "23505") return { error: "That team name is taken." };
    return { error: clean(error.message) };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function joinTeam(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const code = str(formData.get("code")).toUpperCase();

  if (code.length !== 6) return { error: "Join codes are 6 characters." };

  const { error } = await supabase.rpc("join_team_by_code", { p_code: code });
  if (error) {
    console.error("[Action] joinTeam error:", error);
    return { error: clean(error.message) };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function addMember(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const email = str(formData.get("email")).toLowerCase();

  if (!email) return { error: "Enter their email address." };

  const { error } = await supabase.rpc("add_member_by_email", { p_email: email });
  if (error) {
    console.error("[Action] addMember error:", error);
    return { error: clean(error.message) };
  }

  revalidatePath("/team");
  revalidatePath("/dashboard");
  return { ok: `${email} added to your team.` };
}

export async function removeMember(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const id = str(formData.get("member_id"));

  const { error } = await supabase.rpc("remove_member", { p_id: id });
  if (error) {
    console.error("[Action] removeMember error:", error);
    return { error: clean(error.message) };
  }

  revalidatePath("/team");
  revalidatePath("/dashboard");
  return { ok: "Member removed." };
}

export async function transferLead(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const id = str(formData.get("member_id"));

  const { error } = await supabase.rpc("transfer_lead", { p_id: id });
  if (error) {
    console.error("[Action] transferLead error:", error);
    return { error: clean(error.message) };
  }

  revalidatePath("/team");
  revalidatePath("/dashboard");
  return { ok: "Team lead transferred." };
}

export async function updateTeam(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const name = str(formData.get("name"));
  const track = str(formData.get("track"));

  if (name.length < 2) return { error: "Give your team a name." };
  if (!TRACKS.includes(track as (typeof TRACKS)[number])) {
    return { error: "Pick one of the five tracks." };
  }

  const { error } = await supabase.rpc("update_team", {
    p_name: name,
    p_track: track,
  });

  if (error) {
    console.error("[Action] updateTeam error:", error);
    if (error.code === "23505") return { error: "That team name is taken." };
    return { error: clean(error.message) };
  }

  revalidatePath("/team");
  revalidatePath("/dashboard");
  return { ok: "Team updated." };
}

export async function leaveTeam(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_team");

  if (error) {
    console.error("[Action] leaveTeam error:", error);
    redirect(`/team?error=${encodeURIComponent(clean(error.message))}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
