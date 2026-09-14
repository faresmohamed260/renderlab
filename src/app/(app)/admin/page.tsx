import { notFound, redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminOperations } from "@/features/admin/admin-operations";
import styles from "@/features/admin/admin-operations.module.css";
import { getCurrentRenderLabAdminAuthorization } from "@/server/admin/admin-auth";
import { getAdminDashboard } from "@/server/admin/admin-operations";

export const dynamic = "force-dynamic";

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

export default async function AdminPage() {
  const authorization = await getCurrentRenderLabAdminAuthorization();
  if (authorization.status === "mfa_enrollment_required") redirect("/settings/mfa");
  if (authorization.status === "mfa_challenge_required") redirect("/settings/mfa/challenge?next=/admin");
  if (authorization.status !== "authorized") notFound();
  const admin = authorization.admin;

  try {
    const snapshot = await getAdminDashboard(admin.identity.id);
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
