"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { RetryGenerationResponse } from "@/lib/api/generation-retry-contract";

type RetryState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

export function ActivityRetryButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [state, setState] = useState<RetryState>({ status: "idle" });
  const submitting = state.status === "submitting";

  async function retry() {
    if (submitting) return;
    setState({ status: "submitting" });

    try {
      const response = await fetch(`/api/generation/jobs/${encodeURIComponent(jobId)}/retry`, {
        method: "POST",
        headers: { accept: "application/json" },
      });
      const payload = await response.json().catch(() => null) as RetryGenerationResponse | null;

      if (!response.ok || !payload?.ok) {
        setState({
          status: "error",
          message: payload && !payload.ok
            ? payload.error.message
            : "Retry could not be started. Try again.",
        });
        return;
      }

      setState({ status: "success" });
      router.refresh();
    } catch {
      setState({ status: "error", message: "Retry could not be started. Try again." });
    }
  }

  return (
    <div className="flex min-w-0 w-full flex-col items-start gap-2 sm:w-auto">
      <Button type="button" variant="secondary" size="sm" disabled={submitting} onClick={retry}>
        {submitting ? (
          <>
            <Spinner aria-hidden="true" className="motion-reduce:animate-none" />
            Retrying…
          </>
        ) : "Retry"}
      </Button>

      {state.status === "success" ? (
        <p className="flex items-center gap-1.5 text-xs text-success" role="status">
          <CheckCircle2 aria-hidden="true" className="size-3.5" />
          Retry started. A new job was added to Activity.
        </p>
      ) : null}

      {state.status === "error" ? (
        <Alert className="max-w-md py-2" role="status">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
