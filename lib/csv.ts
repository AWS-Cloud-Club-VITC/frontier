/** RFC 4180 quoting — a stray comma or quote in a name must not shift columns. */
export function csvCell(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** BOM so Excel opens UTF-8 names correctly. */
export function toCsv(header: string[], rows: unknown[][]) {
  const body = rows.map((r) => r.map(csvCell).join(","));
  return "﻿" + [header.join(","), ...body].join("\r\n");
}
