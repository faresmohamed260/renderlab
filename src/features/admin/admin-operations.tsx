"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import type {
  AdminAccessRole,
  AdminAccessStatus,
  AdminAccountRecord,
  AdminDashboardSnapshot,
} from "@/lib/api/admin-contract";

type Feedback = { kind: "error" | "success"; message: string } | null;

type MutationRunner = (
  key: string,
  url: string,
  init: RequestInit,
  successMessage: string,
) => Promise<boolean>;

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function titleCase(value: string) {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AdminOperations({
  snapshot,
  actorUserId,
}: {
  snapshot: AdminDashboardSnapshot;
  actorUserId: string;
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminAccessRole>("member");

  const runMutation: MutationRunner = async (key, url, init, successMessage) => {
    setBusyKey(key);
    setFeedback(null);
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "content-type": "application/json",
          ...Object.fromEntries(new Headers(init.headers).entries()),
        },
      });
      const payload = await response.json().catch(() => null) as {
        message?: string;
        error?: { message?: string };
      } | null;
      if (!response.ok) {
        setFeedback({
          kind: "error",
          message: payload?.error?.message || "That admin operation could not be completed.",
        });
        return false;
      }
      setFeedback({
        kind: "success",
        message: payload?.message || successMessage,
      });
      router.refresh();
      return true;
    } catch {
      setFeedback({ kind: "error", message: "Admin operations are temporarily unavailable." });
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  async function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await runMutation(
      "invite",
      "/api/admin/invitations",
      {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      },
      "Invitation recorded.",
    );
    if (ok) setInviteEmail("");
  }

  return (
    <div className="flex flex-col gap-10">
      {feedback ? (
        <Alert variant={feedback.kind === "error" ? "destructive" : "default"}>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      <AdminSection
        title="Access"
        description="Invite and manage only identities already admitted to RenderLab. Shared Supabase Auth users are never listed here."
      >
        <form
          className="grid gap-4 rounded-xl border border-border bg-surface-1 p-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end sm:p-5"
          onSubmit={submitInvitation}
        >
          <Field>
            <FieldLabel htmlFor="admin-invite-email">Invite email</FieldLabel>
            <Input
              id="admin-invite-email"
              type="email"
              autoComplete="off"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="person@example.com"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="admin-invite-role">Role</FieldLabel>
            <NativeSelect
              id="admin-invite-role"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as AdminAccessRole)}
            >
              <NativeSelectOption value="member">Member</NativeSelectOption>
              <NativeSelectOption value="admin">Admin</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Button type="submit" disabled={busyKey !== null || !inviteEmail.trim()}>
            {busyKey === "invite" ? <Spinner aria-hidden="true" /> : null}
            Create invitation
          </Button>
        </form>

        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-text">Pending invitations</h3>
            <p className="text-xs text-text-muted">{snapshot.invitations.length} pending</p>
          </div>
          {snapshot.invitations.length ? (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-1">
              {snapshot.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-all text-sm font-semibold text-text">{invitation.email}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {titleCase(invitation.role)} · expires {displayDate(invitation.expiresAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyKey !== null}
                    onClick={() => void runMutation(
                      `revoke:${invitation.id}`,
                      `/api/admin/invitations/${encodeURIComponent(invitation.id)}`,
                      { method: "DELETE" },
                      "Invitation revoked.",
                    )}
                  >
                    {busyKey === `revoke:${invitation.id}` ? <Spinner aria-hidden="true" /> : null}
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-surface-1 p-4 text-sm text-text-muted">
              No pending RenderLab invitations.
            </p>
          )}
        </div>

        <div className="mt-7">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-text">Admitted accounts</h3>
            <p className="text-xs text-text-muted">{snapshot.accounts.length} RenderLab accounts</p>
          </div>
          <div className="flex flex-col gap-3">
            {snapshot.accounts.map((account) => (
              <AccountAccessEditor
                key={`${account.userId}:${account.updatedAt}`}
                account={account}
                actorUserId={actorUserId}
                busyKey={busyKey}
                runMutation={runMutation}
              />
            ))}
          </div>
        </div>
      </AdminSection>

      <AdminSection
        title="Generation controls"
        description="Store bounded per-account generation overrides without changing global defaults or generation admission behavior."
      >
        <div className="flex flex-col gap-3">
          {snapshot.accounts.map((account) => (
            <GenerationOverrideEditor
              key={`${account.userId}:${account.updatedAt}:generation`}
              account={account}
              busyKey={busyKey}
              runMutation={runMutation}
            />
          ))}
        </div>
      </AdminSection>

      <AdminSection
        title="Health"
        description={`Aggregate RenderLab product state over the last ${snapshot.health.windowHours} hours. Raw prompts, media, provider data and backend errors are excluded.`}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <HealthCard label="Active jobs" value={String(snapshot.health.activeJobs)} />
          <HealthCard label="Window" value={`${snapshot.health.windowHours} hours`} />
          <HealthCard label="Since" value={displayDate(snapshot.health.since)} />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <HealthCounts title="Status counts" counts={snapshot.health.statusCounts} />
          <HealthCounts title="Operation counts" counts={snapshot.health.operationCounts} />
          <HealthCounts title="Sanitized error codes" counts={snapshot.health.errorCodeCounts} />
        </div>
      </AdminSection>
    </div>
  );
}

function AdminSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-border pt-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
      <div>
        <h2 className="text-base font-semibold text-text">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-text-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function AccountAccessEditor({
  account,
  actorUserId,
  busyKey,
  runMutation,
}: {
  account: AdminAccountRecord;
  actorUserId: string;
  busyKey: string | null;
  runMutation: MutationRunner;
}) {
  const [role, setRole] = useState<AdminAccessRole>(account.role);
  const [status, setStatus] = useState<AdminAccessStatus>(account.status);
  const isSelf = account.userId === actorUserId;
  const key = `access:${account.userId}`;

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-all text-sm font-semibold text-text">
              {account.email || "Known RenderLab account"}
            </p>
            {isSelf ? (
              <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs font-semibold text-text">
                You
              </span>
            ) : null}
          </div>
          <p className="mt-1 break-all font-mono text-[11px] text-text-muted">{account.userId}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:w-[26rem] xl:grid-cols-[1fr_1fr_auto]">
          <Field>
            <FieldLabel htmlFor={`role-${account.userId}`}>Role</FieldLabel>
            <NativeSelect
              id={`role-${account.userId}`}
              size="sm"
              value={role}
              disabled={isSelf || busyKey !== null}
              onChange={(event) => setRole(event.target.value as AdminAccessRole)}
            >
              <NativeSelectOption value="member">Member</NativeSelectOption>
              <NativeSelectOption value="admin">Admin</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor={`status-${account.userId}`}>Status</FieldLabel>
            <NativeSelect
              id={`status-${account.userId}`}
              size="sm"
              value={status}
              disabled={isSelf || busyKey !== null}
              onChange={(event) => setStatus(event.target.value as AdminAccessStatus)}
            >
              <NativeSelectOption value="active">Active</NativeSelectOption>
              <NativeSelectOption value="suspended">Suspended</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="sm:self-end"
            disabled={isSelf || busyKey !== null || (role === account.role && status === account.status)}
            onClick={() => void runMutation(
              key,
              `/api/admin/accounts/${encodeURIComponent(account.userId)}`,
              { method: "PATCH", body: JSON.stringify({ role, status }) },
              "Account access updated.",
            )}
          >
            {busyKey === key ? <Spinner aria-hidden="true" /> : null}
            Save access
          </Button>
        </div>
      </div>
      {isSelf ? (
        <p className="mt-3 text-xs leading-5 text-text-muted">
          Your own active admin role and status cannot be removed from this account.
        </p>
      ) : null}
    </div>
  );
}

function GenerationOverrideEditor({
  account,
  busyKey,
  runMutation,
}: {
  account: AdminAccountRecord;
  busyKey: string | null;
  runMutation: MutationRunner;
}) {
  const [enabled, setEnabled] = useState(
    account.generationEnabled === null ? "inherit" : account.generationEnabled ? "enabled" : "disabled",
  );
  const [maxActiveJobs, setMaxActiveJobs] = useState(account.maxActiveJobs?.toString() ?? "");
  const [maxJobsPerHour, setMaxJobsPerHour] = useState(account.maxJobsPerHour?.toString() ?? "");
  const key = `generation:${account.userId}`;

  function parsedInteger(value: string) {
    const trimmed = value.trim();
    return trimmed ? Number(trimmed) : null;
  }

  const desiredEnabled = enabled === "inherit" ? null : enabled === "enabled";
  const desiredMaxActiveJobs = parsedInteger(maxActiveJobs);
  const desiredMaxJobsPerHour = parsedInteger(maxJobsPerHour);
  const valid = (
    (desiredMaxActiveJobs === null || (Number.isInteger(desiredMaxActiveJobs) && desiredMaxActiveJobs >= 1 && desiredMaxActiveJobs <= 4))
    && (desiredMaxJobsPerHour === null || (Number.isInteger(desiredMaxJobsPerHour) && desiredMaxJobsPerHour >= 1 && desiredMaxJobsPerHour <= 120))
  );
  const unchanged = desiredEnabled === account.generationEnabled
    && desiredMaxActiveJobs === account.maxActiveJobs
    && desiredMaxJobsPerHour === account.maxJobsPerHour;

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4 sm:p-5">
      <div className="mb-4 min-w-0">
        <p className="break-all text-sm font-semibold text-text">{account.email || "Known RenderLab account"}</p>
        <p className="mt-1 text-xs text-text-muted">{titleCase(account.role)} · {titleCase(account.status)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_auto]">
        <Field>
          <FieldLabel htmlFor={`generation-enabled-${account.userId}`}>Generation override</FieldLabel>
          <NativeSelect
            id={`generation-enabled-${account.userId}`}
            size="sm"
            value={enabled}
            disabled={busyKey !== null}
            onChange={(event) => setEnabled(event.target.value)}
          >
            <NativeSelectOption value="inherit">Default</NativeSelectOption>
            <NativeSelectOption value="enabled">Enabled</NativeSelectOption>
            <NativeSelectOption value="disabled">Disabled</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor={`max-active-${account.userId}`}>Active-job limit</FieldLabel>
          <Input
            id={`max-active-${account.userId}`}
            type="number"
            min={1}
            max={4}
            inputMode="numeric"
            placeholder="Default"
            value={maxActiveJobs}
            disabled={busyKey !== null}
            onChange={(event) => setMaxActiveJobs(event.target.value)}
          />
          <FieldDescription>1–4 or blank</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`max-hourly-${account.userId}`}>Hourly limit</FieldLabel>
          <Input
            id={`max-hourly-${account.userId}`}
            type="number"
            min={1}
            max={120}
            inputMode="numeric"
            placeholder="Default"
            value={maxJobsPerHour}
            disabled={busyKey !== null}
            onChange={(event) => setMaxJobsPerHour(event.target.value)}
          />
          <FieldDescription>1–120 or blank</FieldDescription>
        </Field>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="sm:self-end"
          disabled={busyKey !== null || !valid || unchanged}
          onClick={() => void runMutation(
            key,
            `/api/admin/accounts/${encodeURIComponent(account.userId)}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                generationEnabled: desiredEnabled,
                maxActiveJobs: desiredMaxActiveJobs,
                maxJobsPerHour: desiredMaxJobsPerHour,
              }),
            },
            "Generation overrides updated.",
          )}
        >
          {busyKey === key ? <Spinner aria-hidden="true" /> : null}
          Save overrides
        </Button>
      </div>
    </div>
  );
}

function HealthCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-2 break-words text-lg font-semibold text-text">{value}</p>
    </div>
  );
}

function HealthCounts({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort(([left], [right]) => left.localeCompare(right));
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {entries.length ? (
        <dl className="mt-3 flex flex-col gap-2">
          {entries.map(([label, count]) => (
            <div key={label} className="flex items-center justify-between gap-4 text-sm">
              <dt className="min-w-0 break-words text-text-muted">{titleCase(label)}</dt>
              <dd className="font-semibold tabular-nums text-text">{count}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-text-muted">No matching jobs in this window.</p>
      )}
    </div>
  );
}
