import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountMfaManager } from "@/features/account/account-mfa-manager";
import styles from "@/features/account/account-settings.module.css";
import { getCurrentRenderLabIdentity } from "@/lib/supabase/server";
import { getRenderLabAccountAccess } from "@/server/account/account-access";

export const dynamic = "force-dynamic";

export default async function MfaSettingsPage() {
  const identity = await getCurrentRenderLabIdentity();
  if (!identity) redirect("/settings?auth=signin_required");

  let activeAdmin = false;
  try {
    const access = await getRenderLabAccountAccess(identity.id);
    activeAdmin = access?.status === "active" && access.role === "admin";
  } catch {
    activeAdmin = false;
  }

  return (
    <section className={styles.workspace}>
      <header className={styles.intro}>
        <Link className={styles.backLink} href="/settings">
          ← Settings
        </Link>
        <p className={styles.eyebrow}>Account security</p>
        <h1 className={styles.title}>Multi-factor authentication</h1>
        <p className={styles.lede}>
          Protect sign-in with time-based codes from an authenticator app. RenderLab does not use SMS or recovery codes for this flow.
        </p>
      </header>

      <AccountMfaManager activeAdmin={activeAdmin} />
    </section>
  );
}
