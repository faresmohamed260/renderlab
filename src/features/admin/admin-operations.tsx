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
  AdminGenerationSettings,
} from "@/lib/api/admin-contract";
import styles from "./admin-operations.module.css";

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

function displayDuration(milliseconds: number | null) {
  if (milliseconds === null) return "—";
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${(minutes / 60).toFixed(1)}h`;
}

function displayBoundedCount(value: { count: number; truncated: boolean }) {
  return `${value.count}${value.truncated ? "+" : ""}`;
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
    <div className={styles.surfaceWrap}>
      {feedback ? (
        <Alert variant={feedback.kind === "error" ? "destructive" : "default"}>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className={styles.register} data-admin-register="system-continuity">
        <span className={styles.signatureArc} aria-hidden="true" />

        <AdminRegisterRow index="01" title="Access" rowKey="access">
          <div className={styles.subsection}>
            <SubsectionHeader
              title="Invitation"
              description="Invite only identities intended for RenderLab access."
            />
            <form className={styles.inviteGrid} onSubmit={submitInvitation}>
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
          </div>

          <div className={styles.subsection}>
            <SubsectionHeader
              title="Pending invitations"
              description="Open invitations recorded for RenderLab only."
              meta={`${snapshot.invitations.length} pending`}
            />
            {snapshot.invitations.length ? (
              <div className={styles.recordList} data-admin-list="invitations">
                {snapshot.invitations.map((invitation) => (
                  <div className={styles.pendingRow} key={invitation.id}>
                    <div className={styles.identity}>
                      <p className={styles.identityTitle}>{invitation.email}</p>
                      <p className={styles.identityMeta}>
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
              <p className={styles.emptyState}>No pending RenderLab invitations.</p>
            )}
          </div>

          <div className={styles.subsection}>
            <SubsectionHeader
              title="Admitted accounts"
              description="Only identities already admitted to RenderLab appear here."
              meta={`${snapshot.accounts.length} RenderLab accounts`}
            />
            <div className={styles.accountList} data-admin-list="accounts">
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
        </AdminRegisterRow>

        <AdminRegisterRow index="02" title="Generation" rowKey="generation">
          <div className={styles.subsection}>
            <GlobalGenerationSettingsEditor
              settings={snapshot.settings}
              busyKey={busyKey}
              runMutation={runMutation}
            />
          </div>

          <div className={styles.subsection}>
            <SubsectionHeader
              title="Account overrides"
              description="Default or blank means inherit the global value."
              meta={`${snapshot.accounts.length} accounts`}
            />
            <div className={styles.overrideList} data-admin-list="generation-overrides">
              {snapshot.accounts.map((account) => (
                <GenerationOverrideEditor
                  key={`${account.userId}:${account.updatedAt}:generation`}
                  account={account}
                  busyKey={busyKey}
                  runMutation={runMutation}
                />
              ))}
            </div>
          </div>
        </AdminRegisterRow>

        <AdminRegisterRow index="03" title="Health" rowKey="health">
          <div className={styles.subsection}>
            <SubsectionHeader
              title="Product health"
              description={`Sanitized aggregate RenderLab state over the current ${snapshot.health.windowHours}-hour window.`}
              meta={`${snapshot.health.windowHours}-hour window`}
            />

            <div className={styles.metricStrip} aria-label="Primary health metrics">
              <HealthMetric label="Active jobs" value={String(snapshot.health.activeJobs)} />
              <HealthMetric
                label="Active reservations"
                value={displayBoundedCount(snapshot.health.capacity.activeReservations)}
              />
              <HealthMetric
                label="Completion p50"
                value={displayDuration(snapshot.health.recentJobs.completionTiming.p50Ms)}
              />
              <HealthMetric
                label="Completion p95"
                value={displayDuration(snapshot.health.recentJobs.completionTiming.p95Ms)}
              />
            </div>

            <p className={styles.healthNote}>
              Completion timing is accepted-to-terminal duration for {snapshot.health.recentJobs.completionTiming.sampleCount} recent jobs; it is not an SLA or ETA.
            </p>

            <div className={styles.diagnostics}>
              <HealthCounts title="Status counts" counts={snapshot.health.statusCounts} />
              <HealthCounts title="Operation counts" counts={snapshot.health.operationCounts} />
              <HealthCounts title="Sanitized error codes" counts={snapshot.health.errorCodeCounts} />
              <HealthCounts
                title="Active state age"
                counts={{
                  "Under 15 minutes": snapshot.health.activeStateAge.under15Minutes,
                  "15–60 minutes": snapshot.health.activeStateAge.minutes15To60,
                  "1–2 hours": snapshot.health.activeStateAge.hours1To2,
                  "Over 2 hours": snapshot.health.activeStateAge.over2Hours,
                }}
              />
              <HealthCounts
                title="Failover incidence"
                counts={{
                  "Jobs with failover": snapshot.health.recentJobs.failovers.jobsWithFailover,
                  "Failover events": snapshot.health.recentJobs.failovers.eventCount,
                }}
              />
              <HealthCounts
                title="Maintenance backlog"
                counts={{
                  "Stale source candidates": displayBoundedCount(snapshot.health.maintenanceBacklog.staleSourceCandidates),
                  "Cleaning sources": displayBoundedCount(snapshot.health.maintenanceBacklog.cleaningSources),
                  "Stale upload candidates": displayBoundedCount(snapshot.health.maintenanceBacklog.staleUploadCandidates),
                  "Cleaning uploads": displayBoundedCount(snapshot.health.maintenanceBacklog.cleaningUploads),
                  "Pending media purges": displayBoundedCount(snapshot.health.maintenanceBacklog.pendingMediaPurges),
                }}
              />
            </div>

            <div className={styles.healthFooter}>
              <p>Window: {snapshot.health.windowHours} hours since {displayDate(snapshot.health.since)}.</p>
              <p>
                Capacity: generation {snapshot.health.capacity.generationEnabled ? "enabled" : "paused"}; per-account defaults are {snapshot.health.capacity.maxActiveJobsPerAccount} active and {snapshot.health.capacity.maxJobsPerHourPerAccount} per hour.
              </p>
              <p>
                A “+” count means the bounded operator scan was truncated; raw job, account, provider and storage identities remain server-only.
              </p>
            </div>
          </div>
        </AdminRegisterRow>
      </div>
    </div>
  );
}

function AdminRegisterRow({
  index,
  title,
  rowKey,
  children,
}: {
  index: string;
  title: string;
  rowKey: "access" | "generation" | "health";
  children: ReactNode;
}) {
  return (
    <section className={styles.row} data-admin-row={rowKey}>
      <div className={styles.labelCell}>
        <span className={styles.index}>{index}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      <div className={styles.valueCell}>{children}</div>
    </section>
  );
}

function SubsectionHeader({
  title,
  description,
  meta,
}: {
  title: string;
  description: string;
  meta?: string;
}) {
  return (
    <div className={styles.subHead}>
      <div className={styles.subHeadCopy}>
        <h3 className={styles.microTitle}>{title}</h3>
        <p className={styles.helper}>{description}</p>
      </div>
      {meta ? <p className={styles.meta}>{meta}</p> : null}
    </div>
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
    <div className={styles.accountRow} data-admin-account={account.userId}>
      <div className={styles.identity}>
        <div className={styles.identityHeading}>
          <p className={styles.identityTitle}>{account.email || "Known RenderLab account"}</p>
          {isSelf ? <span className={styles.youBadge}>You</span> : null}
        </div>
        <p className={styles.userId}>{account.userId}</p>
        <p className={styles.identityMeta}>{titleCase(account.role)} · {titleCase(account.status)}</p>
      </div>

      <Field className={styles.roleField}>
        <FieldLabel htmlFor={`role-${account.userId}`}>Role</FieldLabel>
        <NativeSelect
          id={`role-${account.userId}`}
          value={role}
          disabled={isSelf || busyKey !== null}
          onChange={(event) => setRole(event.target.value as AdminAccessRole)}
        >
          <NativeSelectOption value="member">Member</NativeSelectOption>
          <NativeSelectOption value="admin">Admin</NativeSelectOption>
        </NativeSelect>
      </Field>

      <Field className={styles.statusField}>
        <FieldLabel htmlFor={`status-${account.userId}`}>Status</FieldLabel>
        <NativeSelect
          id={`status-${account.userId}`}
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
        variant="secondary"
        className={styles.rowAction}
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

      {isSelf ? (
        <p className={styles.selfNote}>
          Your own active admin role and status cannot be removed from this account.
        </p>
      ) : null}
    </div>
  );
}

function GlobalGenerationSettingsEditor({
  settings,
  busyKey,
  runMutation,
}: {
  settings: AdminGenerationSettings;
  busyKey: string | null;
  runMutation: MutationRunner;
}) {
  const [enabled, setEnabled] = useState(settings.generationEnabled ? "enabled" : "disabled");
  const [maxActiveJobs, setMaxActiveJobs] = useState(String(settings.maxActiveJobs));
  const [maxJobsPerHour, setMaxJobsPerHour] = useState(String(settings.maxJobsPerHour));
  const desiredMaxActiveJobs = Number(maxActiveJobs);
  const desiredMaxJobsPerHour = Number(maxJobsPerHour);
  const desiredEnabled = enabled === "enabled";
  const valid = Number.isInteger(desiredMaxActiveJobs)
    && desiredMaxActiveJobs >= 1
    && desiredMaxActiveJobs <= 4
    && Number.isInteger(desiredMaxJobsPerHour)
    && desiredMaxJobsPerHour >= 1
    && desiredMaxJobsPerHour <= 120;
  const unchanged = desiredEnabled === settings.generationEnabled
    && desiredMaxActiveJobs === settings.maxActiveJobs
    && desiredMaxJobsPerHour === settings.maxJobsPerHour;
  const key = "generation:global";

  return (
    <div className={styles.globalTier}>
      <SubsectionHeader
        title="Global defaults"
        description="These guardrails apply to active RenderLab accounts unless an account override is set below."
        meta={`Updated ${displayDate(settings.updatedAt)}`}
      />
      <div className={styles.generationGrid}>
        <Field>
          <FieldLabel htmlFor="global-generation-enabled">Generation</FieldLabel>
          <NativeSelect
            id="global-generation-enabled"
            value={enabled}
            disabled={busyKey !== null}
            onChange={(event) => setEnabled(event.target.value)}
          >
            <NativeSelectOption value="enabled">Enabled</NativeSelectOption>
            <NativeSelectOption value="disabled">Paused</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="global-max-active">Active-job limit</FieldLabel>
          <Input
            id="global-max-active"
            type="number"
            min={1}
            max={4}
            inputMode="numeric"
            value={maxActiveJobs}
            disabled={busyKey !== null}
            onChange={(event) => setMaxActiveJobs(event.target.value)}
          />
          <FieldDescription>1–4 concurrent admissions</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="global-max-hourly">Hourly limit</FieldLabel>
          <Input
            id="global-max-hourly"
            type="number"
            min={1}
            max={120}
            inputMode="numeric"
            value={maxJobsPerHour}
            disabled={busyKey !== null}
            onChange={(event) => setMaxJobsPerHour(event.target.value)}
          />
          <FieldDescription>1–120 admitted jobs</FieldDescription>
        </Field>
        <Button
          type="button"
          variant="secondary"
          className={styles.rowAction}
          disabled={busyKey !== null || !valid || unchanged}
          onClick={() => void runMutation(
            key,
            "/api/admin/settings",
            {
              method: "PATCH",
              body: JSON.stringify({
                generationEnabled: desiredEnabled,
                maxActiveJobs: desiredMaxActiveJobs,
                maxJobsPerHour: desiredMaxJobsPerHour,
              }),
            },
            "Global generation limits updated.",
          )}
        >
          {busyKey === key ? <Spinner aria-hidden="true" /> : null}
          Save global limits
        </Button>
      </div>
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
    <div className={styles.overrideRow} data-admin-override={account.userId}>
      <div className={styles.identity}>
        <p className={styles.identityTitle}>{account.email || "Known RenderLab account"}</p>
        <p className={styles.identityMeta}>{titleCase(account.role)} · {titleCase(account.status)}</p>
      </div>
      <Field>
        <FieldLabel htmlFor={`generation-enabled-${account.userId}`}>Generation</FieldLabel>
        <NativeSelect
          id={`generation-enabled-${account.userId}`}
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
        <FieldLabel htmlFor={`max-active-${account.userId}`}>Active jobs</FieldLabel>
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
        <FieldLabel htmlFor={`max-hourly-${account.userId}`}>Hourly</FieldLabel>
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
        variant="secondary"
        className={styles.rowAction}
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
  );
}

function HealthMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metric}>
      <p className={styles.metricLabel}>{label}</p>
      <p className={styles.metricValue}>{value}</p>
    </div>
  );
}

function HealthCounts({ title, counts }: { title: string; counts: Record<string, ReactNode> }) {
  const entries = Object.entries(counts).sort(([left], [right]) => left.localeCompare(right));
  return (
    <section className={styles.diagnostic}>
      <h3 className={styles.diagnosticTitle}>{title}</h3>
      {entries.length ? (
        <dl className={styles.diagnosticList}>
          {entries.map(([label, count]) => (
            <div key={label} className={styles.diagnosticEntry}>
              <dt>{titleCase(label)}</dt>
              <dd>{count}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={styles.emptyDiagnostic}>No matching jobs in this window.</p>
      )}
    </section>
  );
}
