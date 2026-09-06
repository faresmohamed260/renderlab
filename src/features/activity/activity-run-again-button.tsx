"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { RunAgainGenerationResponse } from "@/lib/api/generation-run-again-contract";

type RunAgainState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

export function ActivityRunAgainButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [state, setState] = useState<RunAgainState>({ status: "idle" });
  const submitting = state.status === "submitting";

  async function runAgain() {
    if (submitting) return;
    setState({ status: "submitting" });
    try {
      const response = await fetch(`/api/generation/jobs/${encodeURIComponent(jobId)}/run-again`, {
        method: "POST",
        headers: { accept: "application/json" },
      });
      const payload = await response.json().catch(() => null) as RunAgainGenerationResponse | null;
      if (!response.ok || !payload?.ok) {
        setState({
          status: "error",
          message: payload && !payload.ok ? payload.error.message : "Run again could not be started. Try again.",
        });
        return;
      }
      setState({ status: "success" });
      router.refresh();
    } catch {
      setState({ status: "error", message: "Run again could not be started. Try again." });
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-stretch gap-2 sm:flex-none sm:items-start">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full sm:w-auto"
        disabled={submitting}
        onClick={runAgain}
      >
        {submitting ? (
          <>
            <Spinner aria-hidden="true" className="motion-reduce:animate-none" />
            Running again…
          </>
        ) : "Run again"}
      </Button>
      {state.status === "success" ? (
        <p className="flex items-center gap-1.5 text-xs text-success" role="status">
          <CheckCircle2 aria-hidden="true" className="size-3.5" />
          New generation started.
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
