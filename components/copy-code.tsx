"use client";

import { useState } from "react";

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="border-[3px] border-ink bg-paper px-5 py-3 font-mono text-3xl font-bold tracking-[0.3em] text-ink">
        {code}
      </div>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            setCopied(false);
          }
        }}
        className="border-[3px] border-ink bg-ink px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-paper transition-all duration-100 hover:bg-purple"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
