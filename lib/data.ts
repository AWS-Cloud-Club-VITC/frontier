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

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile) ?? null;
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
