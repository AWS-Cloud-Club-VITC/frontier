"use client";

import { useActionState, useState } from "react";
import { adminDeleteSubmission, type ActionState } from "@/app/actions";
import { Notice } from "@/components/ui";
import type { SubmissionRow as SubmissionRowType } from "./data-tabs";

const empty: ActionState = {};

function isPdf(fileName: string) {
  return fileName.toLowerCase().endsWith(".pdf");
}

export function SubmissionRow({ submission }: { submission: SubmissionRowType }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteState, deleteAction, deleting] = useActionState(adminDeleteSubmission, empty);

  return (
    <>
      <tr className="border-b-[3px] border-hairline last:border-0">
        <td className="px-4 py-3 font-sans text-sm font-bold">{submission.teamName ?? "—"}</td>
        <td className="px-4 py-3 font-sans text-sm">{submission.track ?? "—"}</td>
        <td className="px-4 py-3 font-mono text-xs">{submission.file_name}</td>
        <td className="px-4 py-3 font-mono text-xs">v{submission.version}</td>
        <td className="px-4 py-3 font-mono text-xs">{submission.submitterEmail ?? "—"}</td>
        <td className="px-4 py-3 font-mono text-xs">{submission.submitted_at}</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {submission.downloadUrl && (
              <a
                href={submission.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] font-bold uppercase text-purple underline underline-offset-4"
              >
                Download
              </a>
            )}
            {submission.downloadUrl && (
              <button
                type="button"
                onClick={() => setPreviewOpen((v) => !v)}
                className="font-mono text-[11px] font-bold uppercase text-purple underline underline-offset-4"
              >
                {previewOpen ? "Hide preview" : "View"}
              </button>
            )}
            <form action={deleteAction}>
              <input type="hidden" name="id" value={submission.id} />
              {confirmingDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={deleting}
                    className="font-mono text-[11px] font-bold uppercase text-ink underline underline-offset-4"
                  >
                    {deleting ? "…" : "Confirm delete?"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="font-mono text-[11px] uppercase text-grey underline underline-offset-4"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="font-mono text-[11px] font-bold uppercase text-muted underline underline-offset-4 hover:text-ink"
                >
                  Delete
                </button>
              )}
            </form>
          </div>
          {deleteState.error && (
            <div className="mt-2 max-w-xs">
              <Notice tone="error">{deleteState.error}</Notice>
            </div>
          )}
        </td>
      </tr>
      {previewOpen && submission.downloadUrl && (
        <tr className="border-b-[3px] border-hairline last:border-0 bg-purple-wash">
          <td colSpan={7} className="px-4 py-4">
            {isPdf(submission.file_name) ? (
              <iframe
                src={submission.downloadUrl}
                title={`Preview of ${submission.file_name}`}
                className="h-[70vh] w-full border-[3px] border-ink bg-paper"
              />
            ) : (
              <Notice tone="info">
                Preview isn&apos;t available for .pptx files — use Download to view it.
              </Notice>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
