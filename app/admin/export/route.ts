import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { ATTENDANCE_SESSIONS, type AttendanceSession } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProfileRow = {
  id: string;
  full_name: string | null;
  reg_no: string | null;
  email: string;
  phone: string | null;
  year: number | null;
  team_id: string | null;
  created_at: string;
  teams: { id: string; name: string; track: string; join_code: string; leader_id: string } | null;
};

type SubmissionRow = {
  id: string;
  team_id: string;
  file_name: string;
  version: number;
  submitted_by: string | null;
  submitted_at: string;
  teams: { name: string; track: string } | null;
};

type RegistrationRow = {
  id: string;
  email: string;
  full_name: string | null;
  reg_no: string | null;
  added_by: string | null;
  created_at: string;
};

type AttendanceQueryRow = {
  registration_id: string;
  session: AttendanceSession;
  present: boolean;
};

const DATASETS = ["participants", "teams", "submissions", "registrations", "attendance"] as const;
type Dataset = (typeof DATASETS)[number];

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const datasetParam = searchParams.get("dataset") ?? "participants";
  const dataset = (DATASETS as readonly string[]).includes(datasetParam)
    ? (datasetParam as Dataset)
    : "participants";

  let header: string[];
  let rows: unknown[][];

  if (dataset === "teams") {
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name, track, join_code, leader_id");
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email, team_id");
    const { data: subsData } = await supabase
      .from("submissions")
      .select("team_id, version, submitted_at");

    const teams = teamsData ?? [];
    const profiles = profilesData ?? [];
    const subs = subsData ?? [];

    const leaderMap = new Map(profiles.map((p) => [p.id, p]));
    const memberCounts = new Map<string, number>();
    for (const p of profiles) {
      if (p.team_id) {
        memberCounts.set(p.team_id, (memberCounts.get(p.team_id) ?? 0) + 1);
      }
    }
    const subByTeam = new Map(subs.map((s) => [s.team_id, s]));

    header = ["Team", "Track", "Join Code", "Members", "Lead Name", "Lead Email", "Submission"];
    rows = teams.map((t) => {
      const leader = leaderMap.get(t.leader_id);
      const memberCount = memberCounts.get(t.id) ?? 0;
      const sub = subByTeam.get(t.id);
      return [
        t.name,
        t.track,
        t.join_code,
        memberCount,
        leader?.full_name ?? "",
        leader?.email ?? "",
        sub ? `v${sub.version} — ${sub.submitted_at}` : "Not submitted",
      ];
    });
  } else if (dataset === "submissions") {
    const { data } = await supabase
      .from("submissions")
      .select("id, team_id, file_name, version, submitted_by, submitted_at, teams(name, track)")
      .order("submitted_at", { ascending: true });
    const submissions = (data ?? []) as unknown as SubmissionRow[];

    const submitterIds = [...new Set(submissions.map((s) => s.submitted_by).filter(Boolean))] as string[];
    const { data: submitters } = submitterIds.length
      ? await supabase.from("profiles").select("id, full_name, email").in("id", submitterIds)
      : { data: [] };
    const submitterMap = new Map((submitters ?? []).map((s) => [s.id, s]));

    header = ["Team", "Track", "File Name", "Version", "Submitted By", "Submitted At"];
    rows = submissions.map((s) => {
      const submitter = s.submitted_by ? submitterMap.get(s.submitted_by) : null;
      return [
        s.teams?.name ?? "",
        s.teams?.track ?? "",
        s.file_name,
        s.version,
        submitter?.email ?? "",
        s.submitted_at,
      ];
    });
  } else if (dataset === "registrations") {
    const { data } = await supabase
      .from("registrations")
      .select("id, email, full_name, reg_no, added_by, created_at")
      .order("created_at", { ascending: true });
    const registrations = (data ?? []) as unknown as RegistrationRow[];

    const adderIds = [...new Set(registrations.map((r) => r.added_by).filter(Boolean))] as string[];
    const { data: adders } = adderIds.length
      ? await supabase.from("profiles").select("id, email").in("id", adderIds)
      : { data: [] };
    const adderMap = new Map((adders ?? []).map((a) => [a.id, a]));

    header = ["Email", "Full Name", "Registration No", "Added By", "Added At"];
    rows = registrations.map((r) => [
      r.email,
      r.full_name ?? "",
      r.reg_no ?? "",
      r.added_by ? adderMap.get(r.added_by)?.email ?? "reg desk" : "Excel import",
      r.created_at,
    ]);
  } else if (dataset === "attendance") {
    const { data: registrationsData } = await supabase
      .from("registrations")
      .select("id, email, full_name, reg_no, created_at")
      .order("created_at", { ascending: true });
    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("registration_id, session, present");

    const registrations = registrationsData ?? [];
    const attendanceRows = (attendanceData ?? []) as unknown as AttendanceQueryRow[];

    const byRegistration = new Map<string, Partial<Record<AttendanceSession, boolean>>>();
    for (const a of attendanceRows) {
      if (!byRegistration.has(a.registration_id)) byRegistration.set(a.registration_id, {});
      byRegistration.get(a.registration_id)![a.session] = a.present;
    }

    header = ["Email", "Full Name", "Registration No", ...ATTENDANCE_SESSIONS.map((s) => s.label)];
    rows = registrations.map((r) => {
      const marked = byRegistration.get(r.id) ?? {};
      return [
        r.email,
        r.full_name ?? "",
        r.reg_no ?? "",
        ...ATTENDANCE_SESSIONS.map((s) => (marked[s.key] ? "Present" : "Absent")),
      ];
    });
  } else {
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, full_name, reg_no, email, phone, year, created_at, team_id, teams(id, name, track, join_code, leader_id)"
      )
      .order("created_at", { ascending: true });
    const profiles = (data ?? []) as unknown as ProfileRow[];

    header = [
      "Name",
      "Registration No",
      "Email",
      "Phone",
      "Year",
      "Team",
      "Track",
      "Join Code",
      "Is Lead",
      "Registered At",
    ];
    rows = profiles.map((r) => [
      r.full_name ?? "",
      r.reg_no ?? "",
      r.email,
      r.phone ?? "",
      r.year ?? "",
      r.teams?.name ?? "",
      r.teams?.track ?? "",
      r.teams?.join_code ?? "",
      r.teams?.leader_id === r.id ? "yes" : "no",
      r.created_at,
    ]);
  }

  const csv = toCsv(header, rows);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="frontier-${dataset}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
