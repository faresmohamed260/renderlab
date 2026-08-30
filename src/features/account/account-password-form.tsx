"use client";

import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Feedback = { kind: "error" | "success"; message: string } | null;

function passwordUpdateMessage(code: string | undefined) {
  if (code === "weak_password") return "Choose a stronger password and try again.";
  return "Password could not be updated. Try again.";
}

export function AccountPasswordForm({ email, recoveryMode }: { email: string; recoveryMode: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (newPassword.length < 8) {
      setFeedback({ kind: "error", message: "Use at least 8 characters for the new password." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ kind: "error", message: "The new passwords do not match." });
      return;
    }

    setBusy(true);
    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        setFeedback({ kind: "error", message: "Password controls are unavailable in this runtime." });
        return;
      }

      if (!recoveryMode) {
        const { error: reauthenticationError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });
        if (reauthenticationError) {
          setFeedback({ kind: "error", message: "Current password could not be verified." });
          return;
        }
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setFeedback({ kind: "error", message: passwordUpdateMessage(error.code) });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFeedback({ kind: "success", message: "Password updated." });
      window.location.assign("/settings/password/complete");
    } catch {
      setFeedback({ kind: "error", message: "Password could not be updated. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex max-w-lg flex-col gap-5" onSubmit={handleSubmit}>
      <div className="rounded-xl border border-border bg-surface-1 p-5 sm:p-6">
        <FieldGroup>
          {!recoveryMode ? (
            <Field>
              <FieldLabel htmlFor="current-password">Current password</FieldLabel>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="new-password">New password</FieldLabel>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
            <FieldDescription>Use at least 8 characters.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm-new-password">Confirm new password</FieldLabel>
            <Input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
            <FieldError>{feedback?.kind === "error" ? feedback.message : null}</FieldError>
          </Field>
        </FieldGroup>

        <Button
          className="mt-5"
          type="submit"
          disabled={busy || (!recoveryMode && !currentPassword) || newPassword.length < 8 || confirmPassword.length < 8}
        >
          {busy ? <Spinner aria-hidden="true" /> : null}
          Update password
        </Button>
      </div>

      {feedback?.kind === "success" ? (
        <Alert>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
