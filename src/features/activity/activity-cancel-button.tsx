"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { CancelGenerationResponse } from "@/lib/api/generation-cancel-contract";

export function ActivityCancelButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/generation/jobs/${encodeURIComponent(jobId)}/cancel`, {
        method: "POST",
        headers: { accept: "application/json" },
      });
      const payload = await response.json().catch(() => null) as CancelGenerationResponse | null;
      if (!response.ok || !payload?.ok) {
        setError(payload && !payload.ok
          ? payload.error.message
          : "Cancellation could not be requested. Refresh Activity and try again.");
        setOpen(false);
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("Cancellation could not be requested. Refresh Activity and try again.");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-w-0 w-full flex-col items-start gap-2 sm:w-auto">
      <AlertDialog open={open} onOpenChange={(nextOpen) => !submitting && setOpen(nextOpen)}>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={submitting}>
            Cancel
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this generation?</AlertDialogTitle>
            <AlertDialogDescription>
              This attempt can’t be resumed. If cancellation is accepted, any late provider result from this attempt will not be published to RenderLab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Keep running</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={(event) => {
                event.preventDefault();
                void cancel();
              }}
            >
              {submitting ? (
                <>
                  <Spinner aria-hidden="true" className="motion-reduce:animate-none" />
                  Cancelling…
                </>
              ) : "Cancel generation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error ? (
        <Alert className="max-w-md py-2" role="status">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
