"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { RenderLabIdentity } from "@/lib/supabase/server";
import type { RenderLabAccountAccess } from "@/server/account/account-access";

type Feedback = { kind: "error" | "success"; message: string } | null;

type BusyAction = "signin" | "recovery" | "signout" | null;

function accessPresentation(access: RenderLabAccountAccess | null, enforcementEnabled: boolean) {
  if (access?.status === "active") {
    return {
      label: "Active",
      message: "This account has active RenderLab closed-beta access.",
    };
  }
  if (access?.status === "suspended") {
    return {
      label: "Suspended",
      message: "Creation, Library and Activity access are paused. Password and sign-out controls remain available.",
    };
  }
  if (enforcementEnabled) {
    return {
      label: "Invitation required",
      message: "This identity is signed in, but it has not been admitted to the RenderLab closed beta.",
    };
  }
  return {
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
}: {
  configured: boolean;
  identity: RenderLabIdentity | null;
  access: RenderLabAccountAccess | null;
  enforcementEnabled: boolean;
  initialFeedback?: Feedback;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [feedback, setFeedback] = useState<Feedback>(initialFeedback);

  if (!configured) {
    return (
      <Alert>
        <AlertDescription>Account access is not configured in this runtime.</AlertDescription>
      </Alert>
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
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-border bg-surface-1 p-5 sm:p-6">
          <p className="text-sm font-semibold text-text">Signed in</p>
          <p className="mt-1 break-all text-sm text-text-muted">{identity.email ?? "RenderLab account"}</p>

          <div className="mt-5 rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Closed beta access</p>
              <span className="rounded-full border border-border bg-surface-1 px-2.5 py-1 text-xs font-semibold text-text">
                {accessState.label}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-text-muted">{accessState.message}</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/settings/password">Change password</Link>
            </Button>
            <Button variant="secondary" onClick={handleSignOut} disabled={busyAction !== null}>
              {busyAction === "signout" ? <Spinner aria-hidden="true" /> : null}
              Sign out
            </Button>
          </div>
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
    <form className="flex max-w-lg flex-col gap-5" onSubmit={handleSignIn}>
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
          <FieldLabel htmlFor="account-password">Password</FieldLabel>
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

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busyAction !== null || !email.trim() || password.length < 8}>
          {busyAction === "signin" ? <Spinner aria-hidden="true" /> : null}
          Sign in
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busyAction !== null || !email.trim()}
          onClick={handleRecovery}
        >
          {busyAction === "recovery" ? <Spinner aria-hidden="true" /> : null}
          Forgot password
        </Button>
      </div>
    </form>
  );
}
