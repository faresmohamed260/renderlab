import { AdminOperations } from "@/features/admin/admin-operations";
import styles from "@/features/admin/admin-operations.module.css";
import { snapshot } from "../../snapshot";

// Recreates the real AdminPage's authorized render path without using its
// authentication/data dependencies. AdminOperations and the shell are real.
export const dynamic = "force-dynamic";

export default function SyntheticAdminPage() {
  return (
    <section className={styles.workspace} data-admin-system="settings-continuity" data-admin-decision="UI-079">
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Privileged operations</p>
        <h1 className={styles.title}>Admin</h1>
        <p className={styles.lede}>
          Manage RenderLab beta access, generation guardrails and sanitized product health.
        </p>
      </header>
      <AdminOperations snapshot={snapshot} actorUserId="fixture-admin" />
    </section>
  );
}
