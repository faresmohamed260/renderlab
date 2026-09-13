"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { RenderLabIdentity } from "@/lib/supabase/server";
import type { RenderLabAccountAccess } from "@/server/account/account-access";
import styles from "./account-settings.module.css";

type Feedback = { kind: "error" | "success"; message: string } | null;

type BusyAction = "signin" | "recovery" | "signout" | null;

function accessPresentation(access: RenderLabAccountAccess | null, enforcementEnabled: boolean) {
  if (access?.status === "active") {
    return {
      key: "active",
      label: "Active",
      message: "This account has active RenderLab closed-beta access.",
    };
  }
  if (access?.status === "suspended") {
    return {
      key: "suspended",
      label: "Suspended",
      message: "Creation, Library and Activity access are paused. Password and sign-out controls remain available.",
    };
  }
  if (enforcementEnabled) {
    return {
      key: "invitation-required",
      label: "Invitation required",
      message: "This identity is signed in, but it has not been admitted to the RenderLab closed beta.",
    };
  }
  return {
    key: "transition",
    label: "Transition access",
    message: "Closed-beta admission records are being introduced. Existing authenticated access remains available until the explicit account bootstrap is enabled.",
  };
}

export function AccountSettings({
  configured,
  identity,
  access,
  enforcementEnabled,
  initialFeedback = null,
  showAdminLink,
}: {
  configured: boolean;
  identity: RenderLabIdentity | null;
  access: RenderLabAccountAccess | null;
  enforcementEnabled: boolean;
  initialFeedback?: Feedback;
  showAdminLink: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [feedback, setFeedback] = useState<Feedback>(initialFeedback);

  if (!configured) {
    return (
      <div className={styles.runtimeAlert}>
        <Alert>
          <AlertDescription>Account access is not configured in this runtime.</AlertDescription>
        </Alert>
      </div>
    );
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setBusyAction("signin");
    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        setFeedback({ kind: "error", message: "Account access is unavailable in this runtime." });
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setFeedback({ kind: "error", message: "Unable to sign in with those credentials." });
        return;
      }
      setPassword("");
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Sign in is temporarily unavailable. Try again." });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRecovery() {
    setFeedback(null);
    setBusyAction("recovery");
    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        setFeedback({ kind: "error", message: "Password recovery is unavailable in this runtime." });
        return;
      }
      const redirectTo = `${window.location.origin}/auth/confirm?type=recovery&next=/settings/password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) {
        setFeedback({ kind: "error", message: "Password recovery is temporarily unavailable. Try again shortly." });
        return;
      }
      setFeedback({
        kind: "success",
        message: "If this email can receive a recovery link, check its inbox shortly.",
      });
    } catch {
      setFeedback({ kind: "error", message: "Password recovery is temporarily unavailable. Try again shortly." });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSignOut() {
    setFeedback(null);
    setBusyAction("signout");
    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        setFeedback({ kind: "error", message: "Sign out is unavailable in this runtime." });
        return;
      }
      const { error } = await supabase.auth.signOut();
      if (error) {
        setFeedback({ kind: "error", message: "Sign out did not complete. Try again." });
        return;
      }
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Sign out did not complete. Try again." });
    } finally {
      setBusyAction(null);
    }
  }

  if (identity) {
    const accessState = accessPresentation(access, enforcementEnabled);

    return (
      <div className={styles.surfaceWrap}>
        <div className={styles.register} data-account-state="signed-in">
          <span className={styles.signatureArc} aria-hidden="true" />

          <RegisterRow index="01" title="Account">
            <div className={styles.valueStack}>
              <p className={styles.valueLabel}>Sign-in email</p>
              <p className={styles.emailValue}>{identity.email ?? "RenderLab account"}</p>
              <p className={styles.helper}>Used to sign in. Email changes are not currently available.</p>
            </div>
          </RegisterRow>

          <RegisterRow index="02" title="Access">
            <div className={styles.valueStack}>
              <div className={styles.valueHeader}>
                <div>
                  <p className={styles.valueLabel}>Closed Beta access</p>
                  <p className={styles.helper}>RenderLab admission is separate from being signed in.</p>
                </div>
                <span className={styles.status} data-access-state={accessState.key}>
                  {accessState.label}
                </span>
              </div>
              <p className={styles.helper}>{accessState.message}</p>
            </div>
          </RegisterRow>

          <RegisterRow index="03" title="Security">
            <div className={styles.actionRow}>
              <div className={styles.valueStack}>
                <p className={styles.valueLabel}>Password</p>
                <p className={styles.helper}>
                  Change your password. This browser stays signed in while other RenderLab sessions are revoked after a successful update.
                </p>
              </div>
              <Button asChild variant="secondary" size="lg">
                <Link href="/settings/password">Change password</Link>
              </Button>
            </div>
          </RegisterRow>

          <RegisterRow index="04" title="Sessions">
            <div className={styles.actionRow}>
              <div className={styles.valueStack}>
                <p className={styles.valueLabel}>All RenderLab sessions</p>
                <p className={styles.helper}>Ends RenderLab sessions on every device and browser.</p>
              </div>
              <Button
                variant="destructive"
                size="lg"
                onClick={handleSignOut}
                disabled={busyAction !== null}
              >
                {busyAction === "signout" ? <Spinner aria-hidden="true" /> : null}
                Sign out everywhere
              </Button>
            </div>
          </RegisterRow>

          {showAdminLink ? (
            <RegisterRow index="05" title="Admin">
              <div className={styles.actionRow}>
                <div className={styles.valueStack}>
                  <p className={styles.valueLabel}>Admin operations</p>
                  <p className={styles.helper}>
                    Your active RenderLab admin role can open the separate privileged operations surface.
                  </p>
                </div>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/admin">Open Admin</Link>
                </Button>
              </div>
            </RegisterRow>
          ) : null}
        </div>

        {feedback ? (
          <Alert variant={feedback.kind === "error" ? "destructive" : "default"}>
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    );
  }

  return (
    <form className={styles.register} data-account-state="signed-out" onSubmit={handleSignIn}>
      <span className={styles.signatureArc} aria-hidden="true" />
      <RegisterRow index="01" title="Account">
        <div className={styles.formStack}>
          <div className={styles.valueStack}>
            <p className={styles.valueLabel}>Sign in</p>
            <p className={styles.helper}>Use the credentials for your invited RenderLab account.</p>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="account-email">Email</FieldLabel>
              <Input
                id="account-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>
            <Field>
              <div className={styles.fieldHeader}>
                <FieldLabel htmlFor="account-password">Password</FieldLabel>
                <Button
                  type="button"
                  variant="link"
                  size="lg"
                  disabled={busyAction !== null || !email.trim()}
                  onClick={handleRecovery}
                  className={styles.recoveryButton}
                >
                  {busyAction === "recovery" ? <Spinner aria-hidden="true" /> : null}
                  Forgot password
                </Button>
              </div>
              <Input
                id="account-password"
                name="password"
                type="password"
                autoComplete="current-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <FieldDescription>Use your invited RenderLab account credentials.</FieldDescription>
              <FieldError>{feedback?.kind === "error" ? feedback.message : null}</FieldError>
            </Field>
          </FieldGroup>

          {feedback?.kind === "success" ? (
            <Alert>
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className={styles.formActions}>
            <Button type="submit" size="lg" disabled={busyAction !== null || !email.trim() || password.length < 8}>
              {busyAction === "signin" ? <Spinner aria-hidden="true" /> : null}
              Sign in
            </Button>
            <p className={styles.closedBeta}>Invitation-only Closed Beta</p>
          </div>
        </div>
      </RegisterRow>
    </form>
  );
}

function RegisterRow({ index, title, children }: { index: string; title: string; children: ReactNode }) {
  return (
    <section className={styles.row}>
      <div className={styles.labelCell}>
        <span className={styles.index}>{index}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      <div className={styles.valueCell}>{children}</div>
    </section>
  );
}
