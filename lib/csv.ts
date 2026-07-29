/** RFC 4180 quoting — a stray comma or quote in a name must not shift columns. */
export function csvCell(value: unknown) {
  let s = value === null || value === undefined ? "" : String(value);
  // Formula injection: a free-text name/team starting with =, +, -, or @ would
  // execute as a formula when the exported CSV is opened in Excel/Sheets.
  // Prefixing with a tab defuses it without changing the visible text.
  if (/^[=+\-@]/.test(s)) {
    s = "\t" + s;
  }
  return /[",\n\r\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** BOM so Excel opens UTF-8 names correctly. */
export function toCsv(header: string[], rows: unknown[][]) {
  const body = rows.map((r) => r.map(csvCell).join(","));
  return "﻿" + [header.join(","), ...body].join("\r\n");
}
