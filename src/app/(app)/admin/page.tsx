import { notFound, redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminOperations } from "@/features/admin/admin-operations";
import styles from "@/features/admin/admin-operations.module.css";
import { getCurrentRenderLabAdminAuthorization } from "@/server/admin/admin-auth";
import { getAdminDashboard } from "@/server/admin/admin-operations";
import {
  isDiagnosticCode,
  isDiagnosticEventName,
  isDiagnosticLevel,
} from "@/server/observability/diagnostics";
import type { AdminDiagnosticQuery } from "@/server/observability/diagnostic-store";

export const dynamic = "force-dynamic";

type AdminSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function diagnosticQueryFromSearchParams(params: AdminSearchParams): AdminDiagnosticQuery {
  const event = firstParam(params.diagEvent);
  const level = firstParam(params.diagLevel);
  const code = firstParam(params.diagCode);
  const lookback = Number(firstParam(params.diagLookback));
  const limit = Number(firstParam(params.diagLimit));
  return {
    event: isDiagnosticEventName(event) ? event : undefined,
    level: isDiagnosticLevel(level) ? level : undefined,
    code: isDiagnosticCode(code) ? code : undefined,
    lookbackHours: Number.isFinite(lookback) ? lookback : undefined,
    limit: Number.isFinite(limit) ? limit : undefined,
  };
}

function AdminIntro({ unavailable = false }: { unavailable?: boolean }) {
  return (
    <header className={styles.intro}>
      <p className={styles.eyebrow}>Privileged operations</p>
      <h1 className={styles.title}>Admin</h1>
      <p className={styles.lede}>
        {unavailable
          ? "Admin operations are temporarily unavailable."
          : "Manage RenderLab beta access, generation guardrails and sanitized product health."}
      </p>
    </header>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const diagnosticQuery = diagnosticQueryFromSearchParams(await searchParams);
  const authorization = await getCurrentRenderLabAdminAuthorization();
  if (authorization.status === "mfa_enrollment_required") redirect("/settings/mfa");
  if (authorization.status === "mfa_challenge_required") redirect("/settings/mfa/challenge?next=/admin");
  if (authorization.status !== "authorized") notFound();
  const admin = authorization.admin;

  try {
    const snapshot = await getAdminDashboard(admin.identity.id, diagnosticQuery);
    return (
      <section className={styles.workspace} data-admin-system="settings-continuity" data-admin-decision="UI-079">
        <AdminIntro />
        <AdminOperations snapshot={snapshot} actorUserId={admin.identity.id} />
      </section>
    );
  } catch {
    return (
      <section className={styles.workspace} data-admin-system="settings-continuity" data-admin-decision="UI-079">
        <AdminIntro unavailable />
        <Alert variant="destructive">
          <AlertDescription>Admin operations are temporarily unavailable.</AlertDescription>
        </Alert>
      </section>
    );
  }
}
