import type { ScheduleItem } from "@/lib/constants";

export function ScheduleList({
  items,
  dark = false,
}: {
  items: ScheduleItem[];
  dark?: boolean;
}) {
  return (
    <ul className={`mt-5 divide-y-[3px] ${dark ? "divide-paper/15" : "divide-hairline"}`}>
      {items.map((item) => (
        <li key={item.time + item.title} className="flex items-start justify-between gap-4 py-2.5">
          <span
            className={`shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] ${
              dark ? "text-purple-dim" : "text-muted"
            }`}
          >
            {item.time}
          </span>
          <div className="text-right">
            <p className={`font-sans text-sm font-bold ${dark ? "text-paper" : "text-ink"}`}>
              {item.title}
            </p>
            {item.detail && (
              <p className={`mt-1 max-w-xs font-sans text-xs ${dark ? "text-grey" : "text-muted"}`}>
                {item.detail}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
