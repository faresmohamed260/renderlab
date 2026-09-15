"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import styles from "./account-settings.module.css";

type Feedback = { kind: "error" | "success"; message: string } | null;

type EmailChangeResponse = {
  ok?: boolean;
  pendingEmail?: string;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

export function AccountEmailForm({
  currentEmail,
  requiresCurrentPassword,
}: {
  currentEmail: string;
  requiresCurrentPassword: boolean;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setBusy(true);

    try {
      const response = await fetch("/api/account/email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          currentPassword: requiresCurrentPassword ? currentPassword : undefined,
        }),
      });
      const result = (await response.json().catch(() => null)) as EmailChangeResponse | null;

      if (!response.ok || !result?.ok) {
        if (result?.error?.code === "email_change_mfa_required") {
          window.location.assign(`/settings/mfa/challenge?next=${encodeURIComponent("/settings/email")}`);
          return;
        }
        setFeedback({
          kind: "error",
          message: result?.error?.message ?? "Email change could not be started. Try again.",
        });
        return;
      }

      setCurrentPassword("");
      setPendingEmail(result.pendingEmail ?? newEmail.trim());
      setFeedback({
        kind: "success",
        message: result.message ?? "Check both email inboxes to complete the change.",
      });
    } catch {
      setFeedback({ kind: "error", message: "Email change could not be started. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.register}>
        <span className={styles.signatureArc} aria-hidden="true" />
        <section className={styles.row}>
          <div className={styles.labelCell}>
            <span className={styles.index}>01</span>
            <h2 className={styles.sectionTitle}>Sign-in identity</h2>
          </div>
          <div className={styles.valueCell}>
            <div className={styles.formStack}>
              <div className={styles.valueStack}>
                <p className={styles.valueLabel}>Current sign-in email</p>
                <p className={styles.emailValue}>{currentEmail}</p>
                <p className={styles.helper}>
                  Your RenderLab account and ownership stay attached to the same account ID when this address changes.
                </p>
              </div>

              {pendingEmail ? (
                <>
                  <div className={styles.contextBand}>
                    <span className={styles.contextMark} aria-hidden="true" />
                    <div>
                      <p className={styles.valueLabel}>Pending new sign-in email</p>
                      <p className={styles.emailValue}>{pendingEmail}</p>
                      <p className={styles.helper}>
                        Confirm the request from both the current and new email inboxes. Until both confirmations succeed, {currentEmail} remains the sign-in email.
                      </p>
                    </div>
                  </div>
                  {feedback ? (
                    <Alert>
                      <AlertDescription>{feedback.message}</AlertDescription>
                    </Alert>
                  ) : null}
                  <div className={styles.formActions}>
                    <Button asChild variant="secondary" size="lg">
                      <Link href="/settings">Back to Settings</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="new-sign-in-email">New sign-in email</FieldLabel>
                      <Input
                        id="new-sign-in-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={newEmail}
                        onChange={(event) => setNewEmail(event.target.value)}
                        required
                      />
                      <FieldDescription>Use an address you can access now. Supabase Secure Email Change requires confirmation from both inboxes.</FieldDescription>
                    </Field>
                    {requiresCurrentPassword ? (
                      <Field>
                        <FieldLabel htmlFor="email-change-current-password">Current password</FieldLabel>
                        <Input
                          id="email-change-current-password"
                          name="current-password"
                          type="password"
                          autoComplete="current-password"
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                          required
                        />
                        <FieldDescription>RenderLab verifies the current password before starting this sensitive change.</FieldDescription>
                      </Field>
                    ) : (
                      <div className={styles.securityNote}>
                        <p className={styles.valueLabel}>Authenticator verified</p>
                        <p className={styles.helper}>This change is protected by your recent TOTP step-up and the provider&apos;s AAL2 requirement.</p>
                      </div>
                    )}
                  </FieldGroup>

                  {feedback ? (
                    <Alert variant={feedback.kind === "error" ? "destructive" : "default"}>
                      <AlertDescription>{feedback.message}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className={styles.formActions}>
                    <Button
                      size="lg"
                      type="submit"
                      disabled={busy || !newEmail.trim() || (requiresCurrentPassword && !currentPassword)}
                    >
                      {busy ? <Spinner aria-hidden="true" /> : null}
                      Send confirmation emails
                    </Button>
                    <Button asChild variant="secondary" size="lg">
                      <Link href="/settings">Cancel</Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}
