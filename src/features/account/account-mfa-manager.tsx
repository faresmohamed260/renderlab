"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  hasRecentRenderLabTotpStepUp,
  isRenderLabMfaEnrolled,
  normalizeRenderLabMfaAssurance,
} from "@/lib/auth/mfa-assurance";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import styles from "./account-settings.module.css";

type FactorSummary = {
  id: string;
  friendlyName: string | null;
};

type Enrollment = {
  id: string;
  qrCode: string;
  secret: string;
};

type Feedback = { kind: "error" | "success"; message: string } | null;

export function AccountMfaManager({ activeAdmin }: { activeAdmin: boolean }) {
  const [factors, setFactors] = useState<FactorSummary[]>([]);
  const [friendlyName, setFriendlyName] = useState("");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function loadFactors() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) throw new Error("MFA unavailable");
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    setFactors(
      data.totp
        .filter((factor) => factor.status === "verified")
        .map((factor) => ({ id: factor.id, friendlyName: factor.friendly_name ?? null })),
    );
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await loadFactors();
      } catch {
        if (active) setFeedback({ kind: "error", message: "Authenticator settings are temporarily unavailable." });
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function requireRecentStepUp() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return false;
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const assurance = error ? null : normalizeRenderLabMfaAssurance(data);
    if (!assurance) {
      setFeedback({ kind: "error", message: "Security verification is temporarily unavailable." });
      return false;
    }
    if (!isRenderLabMfaEnrolled(assurance) || hasRecentRenderLabTotpStepUp(assurance)) return true;
    window.location.assign(`/settings/mfa/challenge?next=${encodeURIComponent("/settings/mfa")}`);
    return false;
  }

  async function startEnrollment() {
    setFeedback(null);
    setBusy(true);
    try {
      if (factors.length > 0 && !(await requireRecentStepUp())) return;
      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error("MFA unavailable");
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: friendlyName.trim() || undefined,
      });
      if (error) throw error;
      setEnrollment({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      setCode("");
    } catch {
      setFeedback({ kind: "error", message: "Authenticator setup could not be started. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function verifyEnrollment() {
    if (!enrollment || !code.trim()) return;
    setFeedback(null);
    setBusy(true);
    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error("MFA unavailable");
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollment.id,
        code: code.trim(),
      });
      if (error) throw error;
      setEnrollment(null);
      setFriendlyName("");
      setCode("");
      await loadFactors();
      setFeedback({ kind: "success", message: "Authenticator verified. Multi-factor authentication is active." });
    } catch {
      setFeedback({ kind: "error", message: "That authenticator code could not be verified. Try the current code." });
    } finally {
      setBusy(false);
    }
  }

  async function cancelEnrollment() {
    const pending = enrollment;
    setEnrollment(null);
    setCode("");
    if (!pending) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    await supabase.auth.mfa.unenroll({ factorId: pending.id });
  }

  async function removeFactor(factorId: string) {
    setFeedback(null);
    if (activeAdmin && factors.length === 1) {
      setFeedback({
        kind: "error",
        message: "Active Admin access requires at least one verified authenticator. Add a replacement before removing this factor.",
      });
      return;
    }
    setBusy(true);
    try {
      if (!(await requireRecentStepUp())) return;
      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error("MFA unavailable");
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      await supabase.auth.refreshSession();
      await loadFactors();
      setFeedback({ kind: "success", message: "Authenticator removed." });
    } catch {
      setFeedback({ kind: "error", message: "Authenticator could not be removed. Verify again and retry." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.surfaceWrap}>
      <div className={styles.register}>
        <span className={styles.signatureArc} aria-hidden="true" />
        <section className={styles.row}>
          <div className={styles.labelCell}>
            <span className={styles.index}>01</span>
            <h2 className={styles.sectionTitle}>Authenticators</h2>
          </div>
          <div className={styles.valueCell}>
            <div className={styles.passwordStack}>
              <div className={styles.valueStack}>
                <p className={styles.valueLabel}>TOTP authenticator apps</p>
                <p className={styles.helper}>
                  RenderLab supports authenticator-app codes. Add a backup authenticator if losing one device would lock you out.
                </p>
              </div>

              {busy && factors.length === 0 && !enrollment ? <Spinner aria-label="Loading authenticator settings" /> : null}

              {factors.map((factor, index) => (
                <div className={styles.factorRow} key={factor.id}>
                  <div className={styles.valueStack}>
                    <p className={styles.valueLabel}>{factor.friendlyName || `Authenticator ${index + 1}`}</p>
                    <p className={styles.helper}>Verified TOTP factor</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    disabled={busy}
                    onClick={() => removeFactor(factor.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}

              {!enrollment ? (
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="mfa-friendly-name">Authenticator label</FieldLabel>
                    <Input
                      id="mfa-friendly-name"
                      value={friendlyName}
                      maxLength={64}
                      onChange={(event) => setFriendlyName(event.target.value)}
                      placeholder={factors.length === 0 ? "Primary authenticator" : "Backup authenticator"}
                    />
                    <FieldDescription>This label is only for identifying your own factors.</FieldDescription>
                  </Field>
                  <div className={styles.passwordActions}>
                    <Button type="button" size="lg" disabled={busy} onClick={startEnrollment}>
                      {busy ? <Spinner aria-hidden="true" /> : null}
                      {factors.length === 0 ? "Set up authenticator" : "Add authenticator"}
                    </Button>
                  </div>
                </FieldGroup>
              ) : (
                <div className={styles.enrollmentGrid}>
                  <div className={styles.qrPanel}>
                    {/* Supabase returns a short-lived data URL for this enrollment only. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={styles.qrCode} src={enrollment.qrCode} alt="Authenticator setup QR code" />
                  </div>
                  <div className={styles.passwordStack}>
                    <div className={styles.valueStack}>
                      <p className={styles.valueLabel}>Manual setup key</p>
                      <code className={styles.secretValue}>{enrollment.secret}</code>
                      <p className={styles.helper}>Do not share this key. It is shown only while this setup is in progress.</p>
                    </div>
                    <Field>
                      <FieldLabel htmlFor="mfa-enrollment-code">Authenticator code</FieldLabel>
                      <Input
                        id="mfa-enrollment-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={code}
                        onChange={(event) => setCode(event.target.value.trim())}
                        required
                      />
                    </Field>
                    <div className={styles.buttonCluster}>
                      <Button type="button" size="lg" disabled={busy || !code.trim()} onClick={verifyEnrollment}>
                        {busy ? <Spinner aria-hidden="true" /> : null}
                        Verify authenticator
                      </Button>
                      <Button type="button" variant="secondary" size="lg" disabled={busy} onClick={cancelEnrollment}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {feedback ? (
        <Alert variant={feedback.kind === "error" ? "destructive" : "default"}>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
