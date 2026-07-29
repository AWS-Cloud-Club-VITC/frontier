"use client";

import { useState } from "react";
import { Notice } from "@/components/ui";

function isPdf(fileName: string) {
  return fileName.toLowerCase().endsWith(".pdf");
}

export function FilePreviewToggle({
  fileName,
  url,
  height = "70vh",
}: {
  fileName: string;
  url: string | null;
  height?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!url) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-mono text-[11px] font-bold uppercase text-purple underline underline-offset-4"
      >
        {open ? "Hide preview" : "View"}
      </button>
      {open && (
        <div className="mt-3 w-full">
          {isPdf(fileName) ? (
            <iframe
              src={url}
              title={`Preview of ${fileName}`}
              className="w-full border-[3px] border-ink bg-paper"
              style={{ height }}
            />
          ) : (
            <Notice tone="info">
              Preview isn&apos;t available for .pptx files — use Download to view it.
            </Notice>
          )}
        </div>
      )}
    </>
  );
}
