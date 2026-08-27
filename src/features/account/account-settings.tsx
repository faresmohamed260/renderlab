"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { RenderLabAccount } from "@/lib/supabase/server";

type Feedback = { kind: "error" | "success"; message: string } | null;

export function AccountSettings({
  configured,
  account,
}: {
  configured: boolean;
  account: RenderLabAccount | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busyAction, setBusyAction] = useState<"signin" | "signup" | "signout" | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  if (!configured) {
    return (
      <Alert>
        <AlertDescription>
          Account access is not configured in this runtime yet. Existing RenderLab creation and Library behavior remains available.
        </AlertDescription>
      </Alert>
    );
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setBusyAction("signin");
    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error("Account access is not configured.");
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setPassword("");
      router.refresh();
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Sign in failed." });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateAccount() {
    setFeedback(null);
    setBusyAction("signup");
    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error("Account access is not configured.");
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setPassword("");
      if (data.session) {
        router.refresh();
      } else {
        setFeedback({
          kind: "success",
          message: "Account created. Check your email to confirm it, then return here to sign in.",
        });
      }
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Account creation failed." });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSignOut() {
    setFeedback(null);
    setBusyAction("signout");
    try {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error("Account access is not configured.");
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.refresh();
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Sign out failed." });
    } finally {
      setBusyAction(null);
    }
  }

  if (account) {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-border bg-surface-1 p-5 sm:p-6">
          <p className="text-sm font-semibold text-text">Signed in</p>
          <p className="mt-1 break-all text-sm text-text-muted">{account.email ?? "RenderLab account"}</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
            This account is the identity foundation for future private media ownership and personal Library organization.
          </p>
          <Button className="mt-5" variant="secondary" onClick={handleSignOut} disabled={busyAction !== null}>
            {busyAction === "signout" ? <Spinner aria-hidden="true" /> : null}
            Sign out
          </Button>
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
          <FieldDescription>Use at least 8 characters.</FieldDescription>
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
          disabled={busyAction !== null || !email.trim() || password.length < 8}
          onClick={handleCreateAccount}
        >
          {busyAction === "signup" ? <Spinner aria-hidden="true" /> : null}
          Create account
        </Button>
      </div>
    </form>
  );
}
