import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  reg_no: string | null;
  phone: string | null;
  year: number | null;
  team_id: string | null;
  role: "participant" | "admin";
  created_at: string;
};

export type Team = {
  id: string;
  name: string;
  join_code: string;
  track: string;
  leader_id: string;
  created_at: string;
};

export type Member = Pick<
  Profile,
  "id" | "full_name" | "reg_no" | "email" | "phone" | "year"
>;

/** The signed-in user's profile row, or null if not signed in. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      return data as Profile;
    }

    // Newly registered user — attempt fallback profile insertion if trigger was delayed/missed
    if (user.email) {
      const { data: newProfile } = await supabase
        .from("profiles")
        .upsert(
          { id: user.id, email: user.email.toLowerCase() },
          { onConflict: "id" }
        )
        .select("*")
        .maybeSingle();

      if (newProfile) {
        return newProfile as Profile;
      }
    }
  } catch (error) {
    console.error("[getProfile] error fetching profile:", error);
  }

  // Basic profile object shell for authenticated user to allow onboarding access
  return {
    id: user.id,
    email: user.email ?? "",
    full_name: null,
    reg_no: null,
    phone: null,
    year: null,
    team_id: null,
    role: "participant",
    created_at: new Date().toISOString(),
  };
}

export function profileIsComplete(p: Profile | null) {
  return Boolean(p?.full_name && p?.reg_no);
}

export async function getTeam(teamId: string) {
  const supabase = await createClient();

  const [{ data: team }, { data: members }] = await Promise.all([
    supabase.from("teams").select("*").eq("id", teamId).maybeSingle(),
    supabase
      .from("profiles")
      .select("id, full_name, reg_no, email, phone, year")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true }),
  ]);

  return {
    team: (team as Team) ?? null,
    members: (members as Member[]) ?? [],
  };
}

export type Submission = {
  id: string;
  team_id: string;
  file_path: string;
  file_name: string;
  version: number;
  submitted_by: string | null;
  submitted_at: string;
};

export async function getSubmission(teamId: string): Promise<Submission | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("submissions")
    .select("*")
    .eq("team_id", teamId)
    .maybeSingle();

  return (data as Submission) ?? null;
}

export async function getSubmissionDownloadUrl(filePath: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("submissions")
    .createSignedUrl(filePath, 3600);

  if (error || !data) {
    console.error("[getSubmissionDownloadUrl] error:", error);
    return null;
  }
  return data.signedUrl;
}

