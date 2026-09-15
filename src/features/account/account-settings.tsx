"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { isRenderLabMfaChallengeRequired, normalizeRenderLabMfaAssurance } from "@/lib/auth/mfa-assurance";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { RenderLabIdentity } from "@/lib/supabase/server";
import type { RenderLabAccountAccess } from "@/server/account/account-access";
import type { RenderLabSessionSummary } from "@/server/account/account-sessions";
import { AccountDataPrivacy } from "./account-data-privacy";
import { AccountPasswordField } from "./account-password-field";
import styles from "./account-settings.module.css";

type Feedback = { kind: "error" | "success"; message: string } | null;
type BusyAction = "signin" | "recovery" | "signout-local" | "signout-others" | "signout-global" | null;
type MfaState = "disabled" | "verified" | "verification-required" | "unavailable";
type SignOutScope = "local" | "others" | "global";

function accessPresentation(access: RenderLabAccountAccess | null, enforcementEnabled: boolean) {
  if (access?.status === "active") {
    return { key: "active", label: "Active", message: "This account has active RenderLab closed-beta access." };
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

function mfaPresentation(state: MfaState) {
  if (state === "verified") {
    return {
      label: "Manage MFA",
      href: "/settings/mfa",
      message: "Authenticator-app MFA is enabled and this session is verified at AAL2.",
    };
  }
  if (state === "verification-required") {
    return {
      label: "Verify MFA",
      href: "/settings/mfa/challenge?next=/settings",
      message: "Authenticator-app MFA is enabled. Verify a factor to continue protected account access.",
    };
  }
  if (state === "disabled") {
    return {
      label: "Set up MFA",
      href: "/settings/mfa",
      message: "Add an authenticator app for a stronger sign-in requirement.",
    };
  }
  return {
    label: "MFA unavailable",
    href: "/settings/mfa",
    message: "Authenticator assurance could not be verified right now. Protected operations fail closed.",
  };
}

function sessionTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown";
  return `${new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date)} UTC`;
}

export function AccountSettings({
  configured,
  identity,
  access,
  enforcementEnabled,
  initialFeedback = null,
  showAdminLink,
  mfaState,
  sessions,
}: {
  configured: boolean;
  identity: RenderLabIdentity | null;
  access: RenderLabAccountAccess | null;
  enforcementEnabled: boolean;
  initialFeedback?: Feedback;
  showAdminLink: boolean;
  mfaState: MfaState;
  sessions: RenderLabSessionSummary[] | null;
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
      const { data: assuranceData, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const assurance = assuranceError ? null : normalizeRenderLabMfaAssurance(assuranceData);
      if (assurance && isRenderLabMfaChallengeRequired(assurance)) {
        window.location.assign(`/settings/mfa/challenge?next=${encodeURIComponent("/settings")}`);
        return;
      }
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
      setFeedback({ kind: "success", message: "If this email can receive a recovery link, check its inbox shortly." });
    } catch {
      setFeedback({ kind: "error", message: "Password recovery is temporarily unavailable. Try again shortly." });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSignOut(scope: SignOutScope) {
    setFeedback(null);
    const action: BusyAction = scope === "local"
      ? "signout-local"
      : scope === "others"
        ? "signout-others"
        : "signout-global";
    setBusyAction(action);
    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        setFeedback({ kind: "error", message: "Sign out is unavailable in this runtime." });
        return;
      }
      const { error } = await supabase.auth.signOut({ scope });
      if (error) {
        setFeedback({ kind: "error", message: "Sign out did not complete. Try again." });
        return;
      }
      if (scope === "others") {
        setFeedback({ kind: "success", message: "Other RenderLab sessions signed out." });
        router.refresh();
        return;
      }
      window.location.assign("/settings");
    } catch {
      setFeedback({ kind: "error", message: "Sign out did not complete. Try again." });
    } finally {
      setBusyAction(null);
    }
  }

  if (identity) {
    const accessState = accessPresentation(access, enforcementEnabled);
    const mfa = mfaPresentation(mfaState);
    const adminReady = showAdminLink && mfaState === "verified";
    const adminHref = adminReady
      ? "/admin"
      : mfaState === "verification-required"
        ? "/settings/mfa/challenge?next=/admin"
        : "/settings/mfa";

    return (
      <div className={styles.surfaceWrap}>
        <div className={styles.register} data-account-state="signed-in">
          <span className={styles.signatureArc} aria-hidden="true" />

          <RegisterRow index="01" title="Account">
            <div className={styles.actionRow}>
              <div className={styles.valueStack}>
                <p className={styles.valueLabel}>Sign-in email</p>
                <p className={styles.emailValue}>{identity.email ?? "RenderLab account"}</p>
                <p className={styles.helper}>Used to sign in. Changing it keeps the same RenderLab account, access and ownership.</p>
              </div>
              <Button asChild variant="secondary" size="lg">
                <Link href="/settings/email">Change email</Link>
              </Button>
            </div>
          </RegisterRow>

          <RegisterRow index="02" title="Access">
            <div className={styles.valueStack}>
              <div className={styles.valueHeader}>
                <div>
                  <p className={styles.valueLabel}>Closed Beta access</p>
                  <p className={styles.helper}>RenderLab admission is separate from being signed in.</p>
                </div>
                <span className={styles.status} data-access-state={accessState.key}>{accessState.label}</span>
              </div>
              <p className={styles.helper}>{accessState.message}</p>
            </div>
          </RegisterRow>

          <RegisterRow index="03" title="Security">
            <div className={styles.passwordStack}>
              <div className={styles.actionRow}>
                <div className={styles.valueStack}>
                  <p className={styles.valueLabel}>Multi-factor authentication</p>
                  <p className={styles.helper}>{mfa.message}</p>
                </div>
                <Button asChild variant="secondary" size="lg" disabled={mfaState === "unavailable"}>
                  <Link href={mfa.href}>{mfa.label}</Link>
                </Button>
              </div>
              <div className={styles.factorRow}>
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
            </div>
          </RegisterRow>

          <RegisterRow index="04" title="Sessions">
            <div className={styles.sessionStack}>
              <div className={styles.valueStack}>
                <p className={styles.valueLabel}>Active RenderLab sessions</p>
                <p className={styles.helper}>
                  Session labels are based on browser-reported information. RenderLab does not infer a physical location from your network address.
                </p>
              </div>

              {sessions ? (
                <div className={styles.sessionList} aria-label="Active RenderLab sessions">
                  {sessions.map((session) => (
                    <div className={styles.sessionItem} key={session.id} data-current-session={session.isCurrent ? "true" : undefined}>
                      <div className={styles.sessionHeader}>
                        <p className={styles.sessionClient}>{session.clientLabel}</p>
                        {session.isCurrent ? <span className={styles.currentSession}>This device</span> : null}
                      </div>
                      <div className={styles.sessionTimes}>
                        <span>Last active <time dateTime={session.lastActiveAt}>{sessionTime(session.lastActiveAt)}</time></span>
                        <span>Started <time dateTime={session.createdAt}>{sessionTime(session.createdAt)}</time></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>Session details are temporarily unavailable. Sign-out controls remain available.</AlertDescription>
                </Alert>
              )}

              <p className={styles.helper}>Ends RenderLab sessions on every device and browser.</p>
              <div className={styles.sessionActions}>
                <Button variant="secondary" size="lg" onClick={() => handleSignOut("local")} disabled={busyAction !== null}>
                  {busyAction === "signout-local" ? <Spinner aria-hidden="true" /> : null}
                  Sign out this device
                </Button>
                <Button variant="secondary" size="lg" onClick={() => handleSignOut("others")} disabled={busyAction !== null}>
                  {busyAction === "signout-others" ? <Spinner aria-hidden="true" /> : null}
                  Sign out other devices
                </Button>
                <Button variant="destructive" size="lg" onClick={() => handleSignOut("global")} disabled={busyAction !== null}>
                  {busyAction === "signout-global" ? <Spinner aria-hidden="true" /> : null}
                  Sign out everywhere
                </Button>
              </div>
            </div>
          </RegisterRow>

          <RegisterRow index="05" title="Data & Privacy">
            <AccountDataPrivacy />
          </RegisterRow>

          {showAdminLink ? (
            <RegisterRow index="06" title="Admin">
              <div className={styles.actionRow}>
                <div className={styles.valueStack}>
                  <p className={styles.valueLabel}>Admin operations</p>
                  <p className={styles.helper}>
                    {adminReady
                      ? "Your active Admin role is protected by an AAL2 session."
                      : "Active Admin access requires a verified authenticator and an AAL2 session."}
                  </p>
                </div>
                <Button asChild variant="secondary" size="lg">
                  <Link href={adminHref}>{adminReady ? "Open Admin" : "Secure Admin access"}</Link>
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
              <Input id="account-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Field>
            <AccountPasswordField
              id="account-password"
              name="password"
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              description="Use your invited RenderLab account credentials."
              error={feedback?.kind === "error" ? feedback.message : null}
              required
              labelAction={(
                <Button type="button" variant="link" size="lg" disabled={busyAction !== null || !email.trim()} onClick={handleRecovery} className={styles.recoveryButton}>
                  {busyAction === "recovery" ? <Spinner aria-hidden="true" /> : null}
                  Forgot password
                </Button>
              )}
            />
          </FieldGroup>

          {feedback?.kind === "success" ? (
            <Alert><AlertDescription>{feedback.message}</AlertDescription></Alert>
          ) : null}

          <div className={styles.formActions}>
            <Button type="submit" size="lg" disabled={busyAction !== null || !email.trim() || !password}>
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
