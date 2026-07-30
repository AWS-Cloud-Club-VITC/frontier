"use client";

import { useEffect, useState } from "react";

// Fixed instant — 5:30 PM IST, 30 July 2026 (Day 1's on-site building cutoff).
// Not "today at 5:30pm" recomputed on the visitor's clock: this is a one-off
// cutoff for this specific day, not a recurring daily deadline.
const DEADLINE = new Date("2026-07-30T17:30:00+05:30").getTime();

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function BuildDeadlineCountdown() {
  const [msLeft, setMsLeft] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const tick = () => setMsLeft(DEADLINE - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Null on first render (server + initial client paint) so the server's
  // clock is never compared against the visitor's — avoids a hydration
  // mismatch and a one-second flash of the wrong state.
  if (msLeft === null) return null;

  if (msLeft <= 0) {
    return (
      <div className="border-b-[3px] border-ink bg-ink">
        <div className="mx-auto max-w-6xl px-5 py-3 text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-paper/70">
            Day 1 on-site building has wrapped — keep building, submit by 10 PM.
          </p>
        </div>
      </div>
    );
  }

  const totalSeconds = Math.floor(msLeft / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return (
    <div className="border-b-[3px] border-ink bg-purple">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={`mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-5 py-3 text-center ${
          expanded ? "" : "sm:justify-between"
        }`}
      >
        <p
          className={`font-display uppercase tracking-wide text-paper transition-all duration-200 ${
            expanded ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
          }`}
        >
          Day 1
        </p>
        <div className="flex items-center gap-3">
          {!expanded && (
            <div className="flex items-center gap-1.5 font-display text-2xl tabular-nums text-paper">
              <span className="border-[3px] border-paper bg-ink px-2.5 py-0.5">{pad(h)}</span>
              <span className="text-paper/60">:</span>
              <span className="border-[3px] border-paper bg-ink px-2.5 py-0.5">{pad(m)}</span>
              <span className="text-paper/60">:</span>
              <span className="border-[3px] border-paper bg-ink px-2.5 py-0.5">{pad(s)}</span>
            </div>
          )}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className={`h-5 w-5 shrink-0 text-paper transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t-[3px] border-ink bg-ink px-5 py-10">
          <div className="mx-auto max-w-6xl text-center">
            <div className="flex flex-wrap items-center justify-center gap-3 font-display text-6xl tabular-nums text-paper sm:text-8xl">
              <span className="border-[3px] border-purple bg-panel px-4 py-2 sm:px-6">{pad(h)}</span>
              <span className="text-purple-dim">:</span>
              <span className="border-[3px] border-purple bg-panel px-4 py-2 sm:px-6">{pad(m)}</span>
              <span className="text-purple-dim">:</span>
              <span className="border-[3px] border-purple bg-panel px-4 py-2 sm:px-6">{pad(s)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
