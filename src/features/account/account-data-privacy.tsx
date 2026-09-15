"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AccountPasswordField } from "./account-password-field";
import styles from "./account-settings.module.css";

type ExportState = {
  id: string;
  status: "pending" | "processing" | "ready" | "failed" | "expired";
  requestedAt: string;
  generatedAt: string | null;
  expiresAt: string | null;
  sizeBytes: number | null;
  errorCode: string | null;
} | null;

type DeletionState = {
  state: "deleting";
  requestedAt: string;
  quiescenceUntil: string;
  retryCount: number;
  lastErrorCode: string | null;
} | null;

type ApiError = { error?: { code?: string } };

type Feedback = { kind: "error" | "success"; message: string } | null;

function readableTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function bytesLabel(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function AccountDataPrivacy() {
  const [exportState, setExportState] = useState<ExportState>(null);
  const [deletion, setDeletion] = useState<DeletionState>(null);
  const [busy, setBusy] = useState<"export" | "delete" | "progress" | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const loadState = useCallback(async () => {
    const [exportResponse, deletionResponse] = await Promise.all([
      fetch("/api/account/data-export", { cache: "no-store" }),
      fetch("/api/account/delete", { cache: "no-store" }),
    ]);
    if (exportResponse.ok) {
      const payload = await exportResponse.json() as { export?: ExportState };
      setExportState(payload.export ?? null);
    }
    if (deletionResponse.ok) {
      const payload = await deletionResponse.json() as { deletion?: DeletionState };
      setDeletion(payload.deletion ?? null);
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  useEffect(() => {
    if (!deletion) return;
    const timer = window.setInterval(async () => {
      setBusy((current) => current ?? "progress");
      try {
        const response = await fetch("/api/account/delete", { method: "PUT" });
        if (response.status === 401) {
          window.location.assign("/settings");
          return;
        }
        if (response.ok) {
          const payload = await response.json() as { deletion?: DeletionState; process?: { state?: string } };
          if (payload.process?.state === "complete") {
            window.location.assign("/settings");
            return;
          }
          setDeletion(payload.deletion ?? deletion);
        }
      } finally {
        setBusy((current) => current === "progress" ? null : current);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [deletion]);

  async function requestExport() {
    setBusy("export");
    setFeedback(null);
    try {
      const response = await fetch("/api/account/data-export", { method: "POST" });
      const payload = await response.json().catch(() => ({})) as { export?: ExportState } & ApiError;
      if (response.status === 403 && payload.error?.code === "mfa_required") {
        window.location.assign(`/settings/mfa/challenge?next=${encodeURIComponent("/settings")}`);
        return;
      }
      if (!response.ok) {
        setFeedback({ kind: "error", message: "Account export could not be prepared right now." });
        return;
      }
      setExportState(payload.export ?? null);
      setFeedback({ kind: "success", message: "Account export request accepted." });
    } catch {
      setFeedback({ kind: "error", message: "Account export could not be prepared right now." });
    } finally {
      setBusy(null);
    }
  }

  async function requestDeletion() {
    setBusy("delete");
    setFeedback(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, confirmation }),
      });
      const payload = await response.json().catch(() => ({})) as { deletion?: DeletionState } & ApiError;
      if (response.status === 403 && payload.error?.code === "mfa_recent_step_up_required") {
        window.location.assign(`/settings/mfa/challenge?next=${encodeURIComponent("/settings")}`);
        return;
      }
      if (!response.ok) {
        const code = payload.error?.code;
        const message = code === "password_reauthentication_failed"
          ? "Current password could not be verified."
          : code === "last_active_admin"
            ? "The last active Admin cannot delete their account. Promote another active Admin first."
            : "Account deletion could not be accepted right now.";
        setFeedback({ kind: "error", message });
        return;
      }
      setCurrentPassword("");
      setConfirmation("");
      setDeletion(payload.deletion ?? null);
      setFeedback({ kind: "success", message: "Account deletion accepted. New creative work is blocked while cleanup completes." });
    } catch {
      setFeedback({ kind: "error", message: "Account deletion could not be accepted right now." });
    } finally {
      setBusy(null);
    }
  }

  const readyAt = readableTime(exportState?.expiresAt ?? null);
  const generatedSize = bytesLabel(exportState?.sizeBytes ?? null);

  return (
    <div className={styles.passwordStack}>
      <div className={styles.actionRow}>
        <div className={styles.valueStack}>
          <p className={styles.valueLabel}>Account data export</p>
          <p className={styles.helper}>
            Export account/access metadata, prompts and generation history, collection state and a durable-media download manifest as structured JSON. Media files stay behind authenticated RenderLab downloads rather than being packed into an unbounded ZIP.
          </p>
          {exportState?.status === "ready" ? (
            <p className={styles.helper}>Ready{generatedSize ? ` · ${generatedSize}` : ""}{readyAt ? ` · expires ${readyAt}` : ""}.</p>
          ) : exportState?.status === "pending" || exportState?.status === "processing" ? (
            <p className={styles.helper}>Preparing your export.</p>
          ) : null}
        </div>
        {exportState?.status === "ready" ? (
          <Button asChild variant="secondary" size="lg" disabled={Boolean(deletion)}>
            <a href="/api/account/data-export/download">Download export</a>
          </Button>
        ) : (
          <Button variant="secondary" size="lg" onClick={requestExport} disabled={busy !== null || Boolean(deletion)}>
            {busy === "export" ? <Spinner aria-hidden="true" /> : null}
            {exportState?.status === "failed" || exportState?.status === "expired" ? "Prepare new export" : "Export account data"}
          </Button>
        )}
      </div>

      <div className={styles.factorRow}>
        <div className={styles.valueStack}>
          <p className={styles.valueLabel}>Data use</p>
          <p className={styles.helper}>
            RenderLab stores account/product metadata in Supabase and creative objects in Cloudflare R2. Modal processes content required for generation/upscale, and Vercel hosts the web/API execution plane. RenderLab does not use your prompts, uploads or results to train models. Provider service logs follow provider retention policies.
          </p>
        </div>
      </div>

      <div className={styles.factorRow}>
        <div className={styles.valueStack}>
          <p className={styles.valueLabel}>Delete account</p>
          <p className={styles.helper}>
            Irreversible. New work is blocked immediately; active jobs are settled, RenderLab-controlled media and product data are removed, sessions/factors disappear with the Auth identity, and provider service logs may remain for their provider-defined retention period.
          </p>
          {deletion ? (
            <p className={styles.helper}>Deletion is in progress. Cleanup continues even if you close this page.</p>
          ) : null}
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="lg" disabled={busy !== null || Boolean(deletion)}>Delete account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete this RenderLab account?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone. Export anything you need first. Type DELETE and enter your current password to accept irreversible deletion. If MFA is enrolled, a recent authenticator verification is also required.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <FieldGroup className="mt-4">
              <Field>
                <FieldLabel htmlFor="delete-account-confirmation">Type DELETE</FieldLabel>
                <Input id="delete-account-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
                <FieldDescription>This starts an irreversible deletion freeze immediately after verification.</FieldDescription>
              </Field>
              <AccountPasswordField
                id="delete-account-password"
                label="Current password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={setCurrentPassword}
              />
            </FieldGroup>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy === "delete"}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={busy === "delete" || confirmation !== "DELETE" || !currentPassword}
                onClick={(event) => {
                  event.preventDefault();
                  void requestDeletion();
                }}
              >
                {busy === "delete" ? <Spinner aria-hidden="true" /> : null}
                Permanently delete account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {feedback ? (
        <Alert variant={feedback.kind === "error" ? "destructive" : "default"}>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
