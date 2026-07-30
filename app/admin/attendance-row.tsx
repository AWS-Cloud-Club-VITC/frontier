"use client";

import { useEffect, useState, useTransition } from "react";
import { adminSetAttendance } from "@/app/actions";
import { Notice } from "@/components/ui";
import { ATTENDANCE_SESSIONS, type AttendanceSession } from "@/lib/constants";
import type { AttendanceRow as AttendanceRowType } from "./data-tabs";

export function AttendanceRow({ row }: { row: AttendanceRowType }) {
  const [present, setPresent] = useState(row.sessions);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Row keys stay stable across re-renders (by registrationId), so this
  // component instance is reused rather than remounted when the parent
  // server component revalidates with fresh data — without this, a second
  // admin's concurrent attendance change would never show up here until a
  // full page reload.
  useEffect(() => {
    setPresent(row.sessions);
  }, [row.sessions]);

  function toggle(session: AttendanceSession) {
    const next = !present[session];
    setPresent((p) => ({ ...p, [session]: next }));
    setError(null);
    startTransition(async () => {
      const result = await adminSetAttendance(row.registrationId, session, next);
      if (result.error) {
        setPresent((p) => ({ ...p, [session]: !next }));
        setError(result.error);
      }
    });
  }

  return (
    <tr className="border-b-[3px] border-hairline last:border-0">
      <td className="px-4 py-3 font-mono text-xs">{row.email}</td>
      <td className="px-4 py-3 font-sans text-sm">{row.full_name ?? "—"}</td>
      <td className="px-4 py-3 font-mono text-xs uppercase">{row.reg_no ?? "—"}</td>
      {ATTENDANCE_SESSIONS.map((s) => (
        <td key={s.key} className="px-4 py-3 text-center">
          <input
            type="checkbox"
            checked={present[s.key] ?? false}
            disabled={pending}
            onChange={() => toggle(s.key)}
            className="h-5 w-5 accent-purple disabled:opacity-50"
            aria-label={`${s.label} attendance for ${row.email}`}
          />
        </td>
      ))}
      <td className="px-4 py-3">{error && <Notice tone="error">{error}</Notice>}</td>
    </tr>
  );
}
