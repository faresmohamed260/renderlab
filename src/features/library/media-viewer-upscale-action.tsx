"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type UpscaleState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "accepted" }
  | { status: "error"; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function upscaleErrorMessage(payload: unknown) {
  if (!isRecord(payload) || payload.ok !== false || !isRecord(payload.error)) {
    return "Upscale could not be started. Try again.";
  }
  const message = payload.error.message;
  return typeof message === "string" && message.trim()
    ? message.trim().slice(0, 320)
    : "Upscale could not be started. Try again.";
}

export function MediaViewerUpscaleAction({ assetId }: { assetId: string }) {
  const pendingRef = useRef(false);
  const [state, setState] = useState<UpscaleState>({ status: "idle" });
  const submitting = state.status === "submitting";
  const accepted = state.status === "accepted";

  async function startUpscale() {
    if (pendingRef.current || accepted) return;
    pendingRef.current = true;
    setState({ status: "submitting" });

    try {
      const response = await fetch(`/api/media/assets/${encodeURIComponent(assetId)}/upscale`, {
        method: "POST",
        headers: { accept: "application/json" },
      });
      const payload = await response.json().catch(() => null) as unknown;
      if (!response.ok || !isRecord(payload) || payload.ok !== true) {
        pendingRef.current = false;
        setState({ status: "error", message: upscaleErrorMessage(payload) });
        return;
      }
      setState({ status: "accepted" });
    } catch {
      pendingRef.current = false;
      setState({ status: "error", message: "Upscale could not be started. Try again." });
    }
  }

  return (
    <div className="col-span-2 flex min-w-0 flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        disabled={submitting || accepted}
        onClick={startUpscale}
      >
        {submitting ? (
          <>
            <Spinner aria-hidden="true" className="motion-reduce:animate-none" />
            Starting upscale…
          </>
        ) : accepted ? "Upscale started" : "Upscale 2×"}
      </Button>

      {accepted ? (
        <Alert className="border-success/40 bg-success/5" role="status">
          <AlertDescription className="space-y-2">
            <p className="flex min-w-0 items-start gap-2 text-text">
              <CheckCircle2 aria-hidden="true" className="mt-1 size-4 shrink-0 text-success" />
              <span>Upscale started. Track progress in Activity.</span>
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/activity">Open Activity</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription className="flex min-w-0 items-start gap-2">
            <AlertCircle aria-hidden="true" className="mt-1 size-4 shrink-0 text-danger" />
            <span>{state.message}</span>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
