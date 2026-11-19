"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import styles from "./account-settings.module.css";

type FactorSummary = {
  id: string;
  friendlyName: string | null;
};

export function AccountMfaChallenge({ nextPath }: { nextPath: string }) {
  const [factor, setFactor] = useState<FactorSummary | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        if (!supabase) throw new Error("MFA unavailable");
        const { data, error: factorError } = await supabase.auth.mfa.listFactors();
        if (factorError) throw factorError;
        const verified = data.totp
          .filter((candidate) => candidate.status === "verified")
          .map((candidate) => ({ id: candidate.id, friendlyName: candidate.friendly_name ?? null }));
        if (!active) return;
        if (verified.length > 1) {
          setError("This account has an unsupported MFA state. Return to MFA settings and do not continue verification.");
          return;
        }
        setFactor(verified[0] ?? null);
      } catch {
        if (active) setError("Authenticator verification is temporarily unavailable.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factor || !code.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error("MFA unavailable");
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
      if (verifyError) throw verifyError;
      window.location.assign(nextPath);
    } catch {
      setError("That authenticator code could not be verified. Try the current code.");
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
            <h2 className={styles.sectionTitle}>Verification</h2>
          </div>
          <div className={styles.valueCell}>
            <div className={styles.passwordStack}>
              <div className={styles.valueStack}>
                <p className={styles.valueLabel}>Authenticator code</p>
                <p className={styles.helper}>
                  Use a current code from your verified authenticator{factor?.friendlyName ? ` (${factor.friendlyName})` : ""}.
                </p>
              </div>

              {loading ? <Spinner aria-label="Loading authenticator" /> : null}

              {!loading && !factor && !error ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    No verified authenticator is available. <Link href="/settings/mfa">Return to MFA settings</Link>.
                  </AlertDescription>
                </Alert>
              ) : null}

              {factor ? (
                <Field>
                  <FieldLabel htmlFor="mfa-challenge-code">Code</FieldLabel>
                  <Input
                    id="mfa-challenge-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value.trim())}
                    autoFocus
                    required
                  />
                  <FieldDescription>Codes rotate about every 30 seconds.</FieldDescription>
                </Field>
              ) : null}

              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              {factor ? (
                <div className={styles.passwordActions}>
                  <Button type="submit" size="lg" disabled={busy || !code.trim()}>
                    {busy ? <Spinner aria-hidden="true" /> : null}
                    Verify
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}
