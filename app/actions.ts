"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUBMISSIONS_OPEN, TRACKS } from "@/lib/constants";
import { getProfile } from "@/lib/data";

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

export async function addWalkinRegistration(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const email = str(formData.get("email")).toLowerCase();
  const full_name = str(formData.get("full_name"));
  const reg_no = str(formData.get("reg_no")).toUpperCase();

  if (!email) return { error: "Enter their email address." };

  const { error } = await supabase.rpc("add_walkin_registration", {
    p_email: email,
    p_full_name: full_name || null,
    p_reg_no: reg_no || null,
  });

  if (error) {
    console.error("[Action] addWalkinRegistration error:", error);
    return { error: clean(error.message) };
  }

  revalidatePath("/admin");
  return { ok: `${email} added — they can sign in now.` };
}

/* ---------- admin: participants, teams, registrations, submissions ---------- */
// Each of these forwards to an admin_* RPC that checks is_admin() itself —
// see supabase/schema.sql. No client-side role check here, same pattern as
// addWalkinRegistration above.

export async function adminUpdateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const id = str(formData.get("id"));
  const full_name = str(formData.get("full_name"));
  const reg_no = str(formData.get("reg_no")).toUpperCase();
  const phone = str(formData.get("phone"));
  const yearRaw = str(formData.get("year"));

  const { error } = await supabase.rpc("admin_update_profile", {
    p_id: id,
    p_full_name: full_name,
    p_reg_no: reg_no || null,
    p_phone: phone || null,
    p_year: yearRaw ? Number(yearRaw) : null,
  });

  if (error) {
    console.error("[Action] adminUpdateProfile error:", error);
    return { error: clean(error.message) };
  }

  revalidatePath("/admin");
  return { ok: "Participant updated." };
}

export async function adminRemoveFromTeam(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const id = str(formData.get("id"));

  const { error } = await supabase.rpc("admin_remove_from_team", { p_id: id });
  if (error) {
    console.error("[Action] adminRemoveFromTeam error:", error);
    return { error: clean(error.message) };
  }

  revalidatePath("/admin");
  return { ok: "Removed from team." };
}

export async function adminAddToTeam(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const id = str(formData.get("id"));
  const teamId = str(formData.get("team_id"));

  if (!teamId) return { error: "Pick a team first." };

  const { error } = await supabase.rpc("admin_add_to_team", {
    p_id: id,
    p_team_id: teamId,
  });
  if (error) {
    console.error("[Action] adminAddToTeam error:", error);
    return { error: clean(error.message) };
  }

  revalidatePath("/admin");
  return { ok: "Added to team." };
}

export async function adminTransferLead(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const teamId = str(formData.get("team_id"));
  const newLeaderId = str(formData.get("new_leader_id"));

  const { error } = await supabase.rpc("admin_transfer_lead", {
    p_team_id: teamId,
    p_new_leader_id: newLeaderId,
  });
  if (error) {
    console.error("[Action] adminTransferLead error:", error);
    return { error: clean(error.message) };
  }

  revalidatePath("/admin");
  return { ok: "Lead transferred." };
}

export async function adminUpdateTeam(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const teamId = str(formData.get("team_id"));
  const name = str(formData.get("name"));
  const track = str(formData.get("track"));

  const { error } = await supabase.rpc("admin_update_team", {
    p_team_id: teamId,
    p_name: name,
    p_track: track,
  });
  if (error) {
    console.error("[Action] adminUpdateTeam error:", error);
    if (error.code === "23505") return { error: "That team name is taken." };
    return { error: clean(error.message) };
  }

  revalidatePath("/admin");
  return { ok: "Team updated." };
}

export async function adminDeleteTeam(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const teamId = str(formData.get("team_id"));

  const { data: filePath, error } = await supabase.rpc("admin_delete_team", {
    p_team_id: teamId,
  });
  if (error) {
    console.error("[Action] adminDeleteTeam error:", error);
    return { error: clean(error.message) };
  }

  if (filePath) {
    const { error: removeError } = await supabase.storage.from("submissions").remove([filePath]);
    if (removeError) {
      console.error("[Action] adminDeleteTeam storage cleanup error:", removeError);
    }
  }

  revalidatePath("/admin");
  return { ok: "Team deleted." };
}

export async function adminUpdateRegistration(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const id = str(formData.get("id"));
  const full_name = str(formData.get("full_name"));
  const reg_no = str(formData.get("reg_no")).toUpperCase();

  const { error } = await supabase.rpc("admin_update_registration", {
    p_id: id,
    p_full_name: full_name || null,
    p_reg_no: reg_no || null,
  });
  if (error) {
    console.error("[Action] adminUpdateRegistration error:", error);
    return { error: clean(error.message) };
  }

  revalidatePath("/admin");
  return { ok: "Registration updated." };
}

export async function adminDeleteRegistration(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const id = str(formData.get("id"));

  const { error } = await supabase.rpc("admin_delete_registration", { p_id: id });
  if (error) {
    console.error("[Action] adminDeleteRegistration error:", error);
    return { error: clean(error.message) };
  }

  revalidatePath("/admin");
  return { ok: "Registration removed." };
}

export async function adminDeleteSubmission(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const id = str(formData.get("id"));

  const { data: filePath, error } = await supabase.rpc("admin_delete_submission", {
    p_id: id,
  });
  if (error) {
    console.error("[Action] adminDeleteSubmission error:", error);
    return { error: clean(error.message) };
  }

  if (filePath) {
    const { error: removeError } = await supabase.storage.from("submissions").remove([filePath]);
    if (removeError) {
      console.error("[Action] adminDeleteSubmission storage cleanup error:", removeError);
    }
  }

  revalidatePath("/admin");
  return { ok: "Submission deleted." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function uploadSubmission(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are signed out. Sign in again." };

  if (!SUBMISSIONS_OPEN) {
    return { error: "Submissions are currently locked." };
  }

  const profile = await getProfile();
  if (!profile?.team_id) {
    return { error: "You must be in a team to submit." };
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: "Please select a deck file (.pdf or .pptx) to upload." };
  }

  // 8 MB size limit (8,388,608 bytes)
  if (file.size > 8388608) {
    return { error: "File exceeds maximum allowed size of 8 MB." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["pdf", "pptx", "ppt"].includes(ext)) {
    return { error: "Only .pdf and .pptx files are allowed." };
  }

  const teamId = profile.team_id;
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const storagePath = `${teamId}/${Date.now()}_${safeName}`;

  // Get current submission version and file, if any
  const { data: existing } = await supabase
    .from("submissions")
    .select("version, file_path")
    .eq("team_id", teamId)
    .maybeSingle();

  const nextVersion = existing ? existing.version + 1 : 1;

  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("submissions")
    .upload(storagePath, fileBuffer, {
      contentType:
        file.type ||
        (ext === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
      upsert: true,
    });

  if (uploadError) {
    console.error("[Action] uploadSubmission storage error:", uploadError);
    return { error: clean(uploadError.message) };
  }

  const { error: dbError } = await supabase.from("submissions").upsert(
    {
      team_id: teamId,
      file_path: storagePath,
      file_name: file.name,
      version: nextVersion,
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "team_id" }
  );

  if (dbError) {
    console.error("[Action] uploadSubmission DB error:", dbError);
    return { error: clean(dbError.message) };
  }

  if (existing?.file_path && existing.file_path !== storagePath) {
    const { error: removeError } = await supabase.storage
      .from("submissions")
      .remove([existing.file_path]);
    if (removeError) {
      // Non-fatal: the new submission is already saved and pointed at by the
      // DB row. Just leaves an orphaned old file in storage to clean up later.
      console.error("[Action] uploadSubmission old file cleanup error:", removeError);
    }
  }

  revalidatePath("/dashboard");
  return { ok: `Deck v${nextVersion} uploaded successfully!` };
}

