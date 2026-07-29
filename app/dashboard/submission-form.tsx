"use client";

import { useActionState, useState } from "react";
import { uploadSubmission, type ActionState } from "@/app/actions";
import { Button, Chip, Notice, Panel } from "@/components/ui";
import { FilePreviewToggle } from "@/components/file-preview";
import type { Submission } from "@/lib/data";

const initialState: ActionState = {};

export function SubmissionForm({
  submissionsOpen,
  hasTeam,
  isLead,
  submission,
  downloadUrl,
}: {
  submissionsOpen: boolean;
  hasTeam: boolean;
  isLead: boolean;
  submission: Submission | null;
  downloadUrl: string | null;
}) {
  const [state, formAction, isPending] = useActionState(uploadSubmission, initialState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const MAX_FILE_SIZE = 8388608; // 8 MB, matches the server-side cap in uploadSubmission

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_FILE_SIZE) {
      setClientError("File exceeds maximum allowed size of 8 MB.");
      setSelectedFile(null);
      e.target.value = "";
      return;
    }
    setClientError(null);
    setSelectedFile(file);
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Panel tone="ink" className="p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="label !text-purple-dim">Submission</p>
        <Chip tone={submissionsOpen ? "purple" : "orange"}>
          {submissionsOpen ? "Open" : "Locked"}
        </Chip>
      </div>

      <h2 className="mt-4 font-display text-2xl leading-tight">
        {submissionsOpen ? "UPLOAD YOUR DECK" : "OPENS ON DAY 1"}
      </h2>

      <p className="mt-3 font-sans text-sm text-grey">
        {submissionsOpen
          ? "Upload your filled-in slide deck (.pdf or .pptx, max 8 MB). You can replace it any number of times before the deadline."
          : "Slide uploads open when the build starts. Use the template — decks in other formats will not be accepted."}
      </p>

      {/* Notice display */}
      {state?.error && (
        <div className="mt-4">
          <Notice tone="error">{state.error}</Notice>
        </div>
      )}

      {state?.ok && (
        <div className="mt-4">
          <Notice tone="ok">{state.ok}</Notice>
        </div>
      )}

      {/* View current submission */}
      {submission && !isReplacing && (
        <div className="mt-6 space-y-4 border-[3px] border-purple-dim/40 bg-purple/10 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-purple-dim">
              Deck v{submission.version} Submitted
            </span>
            <span className="font-mono text-[11px] text-grey">
              {formatDate(submission.submitted_at)}
            </span>
          </div>

          <div>
            <p className="font-sans text-base font-bold text-paper truncate">
              📄 {submission.file_name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border-[3px] border-ink bg-purple px-4 py-2 font-sans text-xs font-bold uppercase text-paper transition-all hover:bg-purple/90"
              >
                <span>Download Deck</span> ↗
              </a>
            )}

            <FilePreviewToggle fileName={submission.file_name} url={downloadUrl} />

            {submissionsOpen && isLead && (
              <button
                type="button"
                onClick={() => setIsReplacing(true)}
                className="font-mono text-xs uppercase underline tracking-wider text-grey hover:text-paper"
              >
                Replace with new version
              </button>
            )}
          </div>
          {submissionsOpen && !isLead && (
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-grey">
              Only your team lead can replace the deck.
            </p>
          )}
        </div>
      )}

      {/* Upload Form */}
      {submissionsOpen && hasTeam && isLead && (!submission || isReplacing) && (
        <form action={formAction} className="mt-6 space-y-4">
          {submission && (
            <Notice tone="info">
              Uploading a new file replaces v{submission.version} — the old file is deleted
              from storage and can&apos;t be viewed or recovered afterwards.
            </Notice>
          )}

          <div className="border-[3px] border-dashed border-grey/50 p-4 transition-colors hover:border-purple-dim">
            <label className="block cursor-pointer">
              <span className="block font-mono text-[11px] uppercase tracking-[0.14em] text-grey">
                {selectedFile ? "Selected File:" : "Select deck file (.pdf or .pptx)"}
              </span>
              {selectedFile ? (
                <div className="mt-2 flex items-center justify-between text-paper">
                  <span className="font-sans text-sm font-bold truncate">
                    📄 {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </span>
                  <span className="font-mono text-xs uppercase text-purple-dim underline ml-2">
                    Change
                  </span>
                </div>
              ) : (
                <div className="mt-2 font-sans text-xs text-grey">
                  Click to browse files (8 MB max)
                </div>
              )}
              <input
                type="file"
                name="file"
                accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={handleFileChange}
                className="hidden"
                required
              />
            </label>
          </div>

          {clientError && <Notice tone="error">{clientError}</Notice>}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              disabled={isPending || !selectedFile}
              className="w-full sm:w-auto"
            >
              {isPending
                ? "Uploading..."
                : submission
                ? "Upload New Version"
                : "Submit Deck"}
            </Button>

            {submission && isReplacing && (
              <button
                type="button"
                onClick={() => setIsReplacing(false)}
                className="font-mono text-xs uppercase underline text-grey hover:text-paper"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* Not the lead, nothing submitted yet */}
      {submissionsOpen && hasTeam && !isLead && !submission && (
        <div className="mt-6 border-[3px] border-dashed border-grey/50 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-grey">
            Waiting for your team lead to submit the deck
          </p>
        </div>
      )}

      {/* Locked / No Team info */}
      {!hasTeam && (
        <div className="mt-6 border-[3px] border-dashed border-grey/50 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-grey">
            Join a team first
          </p>
        </div>
      )}
    </Panel>
  );
}
