import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountPasswordForm } from "@/features/account/account-password-form";
import styles from "@/features/account/account-settings.module.css";
import { hasRecentRenderLabTotpStepUp, isRenderLabMfaEnrolled } from "@/lib/auth/mfa-assurance";
import { getCurrentRenderLabIdentity, getCurrentRenderLabMfaAssurance } from "@/lib/supabase/server";
import { isPasswordRecoveryMarkerValid, PASSWORD_RECOVERY_COOKIE_NAME } from "@/server/account/recovery-flow";

export const dynamic = "force-dynamic";

export default async function PasswordSettingsPage() {
  const identity = await getCurrentRenderLabIdentity();
  if (!identity?.email) redirect("/settings?auth=signin_required");

  const assurance = await getCurrentRenderLabMfaAssurance();
  if (!assurance) redirect("/settings?auth=unavailable");
  if (isRenderLabMfaEnrolled(assurance) && !hasRecentRenderLabTotpStepUp(assurance)) {
    redirect(`/settings/mfa/challenge?next=${encodeURIComponent("/settings/password")}`);
  }

  const cookieStore = await cookies();
  const recoveryMode = isPasswordRecoveryMarkerValid(cookieStore.get(PASSWORD_RECOVERY_COOKIE_NAME)?.value, identity.id);

  return (
    <section className={styles.workspace}>
      <header className={styles.intro}>
        <Link className={styles.backLink} href="/settings">← Settings</Link>
        <p className={styles.eyebrow}>Security</p>
        <h1 className={styles.title}>{recoveryMode ? "Set a new password" : "Change password"}</h1>
        <p className={styles.lede}>
          {recoveryMode
            ? "Choose a new password for the account verified by your recovery link. Enrolled MFA still requires authenticator verification."
            : "Confirm your current password before replacing it with a new one."}
        </p>
      </header>

      <AccountPasswordForm email={identity.email} recoveryMode={recoveryMode} />
    </section>
  );
}
