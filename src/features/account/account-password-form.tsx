"use client";

import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  hasRecentRenderLabTotpStepUp,
  isRenderLabMfaEnrolled,
  normalizeRenderLabMfaAssurance,
} from "@/lib/auth/mfa-assurance";
import {
  createBrowserSupabaseClient,
  createPasswordVerificationSupabaseClient,
} from "@/lib/supabase/browser";
import {
  meetsRenderLabPasswordPolicy,
  RENDERLAB_PASSWORD_MIN_LENGTH,
  RENDERLAB_PASSWORD_REQUIREMENT,
} from "./password-policy";
import {
  COMPROMISED_PASSWORD_MESSAGE,
  PASSWORD_SAFETY_UNAVAILABLE_MESSAGE,
  screenRenderLabCompromisedPassword,
} from "./compromised-password-screening";
import { AccountPasswordField } from "./account-password-field";
import styles from "./account-settings.module.css";

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

  async function hasRequiredMfaStepUp() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return false;
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const assurance = error ? null : normalizeRenderLabMfaAssurance(data);
    if (!assurance) return false;
    if (!isRenderLabMfaEnrolled(assurance)) return true;
    if (hasRecentRenderLabTotpStepUp(assurance)) return true;
    window.location.assign(`/settings/mfa/challenge?next=${encodeURIComponent("/settings/password")}`);
    return false;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!meetsRenderLabPasswordPolicy(newPassword)) {
      setFeedback({ kind: "error", message: `Use at least ${RENDERLAB_PASSWORD_MIN_LENGTH} characters for the new password.` });
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

      const screening = await screenRenderLabCompromisedPassword(newPassword);
      if (screening === "compromised") {
        setFeedback({ kind: "error", message: COMPROMISED_PASSWORD_MESSAGE });
        return;
      }
      if (screening === "unavailable") {
        setFeedback({ kind: "error", message: PASSWORD_SAFETY_UNAVAILABLE_MESSAGE });
        return;
      }

      if (!recoveryMode) {
        const verifier = createPasswordVerificationSupabaseClient();
        if (!verifier) {
          setFeedback({ kind: "error", message: "Current password verification is unavailable." });
          return;
        }
        const { error: reauthenticationError } = await verifier.auth.signInWithPassword({ email, password: currentPassword });
        if (reauthenticationError) {
          setFeedback({ kind: "error", message: "Current password could not be verified." });
          return;
        }
        await verifier.auth.signOut({ scope: "local" });
      }

      if (!(await hasRequiredMfaStepUp())) {
        setFeedback({ kind: "error", message: "Authenticator verification is required before changing this password." });
        return;
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

  const sessionMessage = recoveryMode
    ? "This recovery session can replace the password only after enrolled MFA is satisfied. Other RenderLab sessions are revoked after the password is changed."
    : "This browser stays signed in. Other RenderLab sessions are revoked after the password is changed.";

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.register}>
        <span className={styles.signatureArc} aria-hidden="true" />
        <section className={styles.row}>
          <div className={styles.labelCell}>
            <span className={styles.index}>01</span>
            <h2 className={styles.sectionTitle}>Security</h2>
          </div>
          <div className={styles.valueCell}>
            <div className={styles.passwordStack}>
              {recoveryMode ? (
                <div className={styles.contextBand}>
                  <span className={styles.contextMark} aria-hidden="true" />
                  <div>
                    <p className={styles.valueLabel}>Verified recovery link</p>
                    <p className={styles.helper}>
                      RenderLab verified this short-lived recovery context. If MFA is enrolled, authenticator verification is still required.
                    </p>
                  </div>
                </div>
              ) : (
                <div className={styles.valueStack}>
                  <p className={styles.valueLabel}>Password replacement</p>
                  <p className={styles.helper}>Verify your current password before choosing the replacement.</p>
                </div>
              )}

              <FieldGroup>
                {!recoveryMode ? (
                  <AccountPasswordField
                    id="current-password"
                    label="Current password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    required
                  />
                ) : null}
                <AccountPasswordField
                  id="new-password"
                  label="New password"
                  autoComplete="new-password"
                  minLength={RENDERLAB_PASSWORD_MIN_LENGTH}
                  value={newPassword}
                  onChange={setNewPassword}
                  description={RENDERLAB_PASSWORD_REQUIREMENT}
                  statusMessage={newPassword ? (meetsRenderLabPasswordPolicy(newPassword) ? "Length requirement met." : RENDERLAB_PASSWORD_REQUIREMENT) : undefined}
                  statusKind={newPassword && !meetsRenderLabPasswordPolicy(newPassword) ? "error" : "success"}
                  required
                />
                <AccountPasswordField
                  id="confirm-new-password"
                  label="Confirm new password"
                  autoComplete="new-password"
                  minLength={RENDERLAB_PASSWORD_MIN_LENGTH}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  statusMessage={confirmPassword ? (newPassword === confirmPassword ? "Passwords match" : "Passwords do not match") : undefined}
                  statusKind={confirmPassword && newPassword !== confirmPassword ? "error" : "success"}
                  required
                />
              </FieldGroup>

              {feedback ? (
                <Alert variant={feedback.kind === "error" ? "destructive" : "default"}>
                  <AlertDescription>{feedback.message}</AlertDescription>
                </Alert>
              ) : null}

              <div className={styles.securityNote}>
                <p className={styles.valueLabel}>Session security</p>
                <p className={styles.helper}>{sessionMessage}</p>
              </div>

              <div className={styles.passwordActions}>
                <Button size="lg" type="submit" disabled={busy || (!recoveryMode && !currentPassword) || !meetsRenderLabPasswordPolicy(newPassword) || !meetsRenderLabPasswordPolicy(confirmPassword)}>
                  {busy ? <Spinner aria-hidden="true" /> : null}
                  Update password
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}
