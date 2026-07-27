import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string;
  full_name: string | null;
  reg_no: string | null;
  email: string;
  phone: string | null;
  year: number | null;
  created_at: string;
  teams: { name: string; track: string; join_code: string; leader_id: string } | null;
};

/** RFC 4180 quoting — a stray comma or quote in a team name must not shift columns. */
function cell(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
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

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, reg_no, email, phone, year, created_at, teams(name, track, join_code, leader_id)"
    )
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as unknown as Row[];

  const header = [
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

  const body = rows.map((r) =>
    [
      r.full_name,
      r.reg_no,
      r.email,
      r.phone,
      r.year,
      r.teams?.name,
      r.teams?.track,
      r.teams?.join_code,
      r.teams?.leader_id === r.id ? "yes" : "no",
      r.created_at,
    ]
      .map(cell)
      .join(",")
  );

  // BOM so Excel opens UTF-8 names correctly
  const csv = "﻿" + [header.join(","), ...body].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="frontier-registrations-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
