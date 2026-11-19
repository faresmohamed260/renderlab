import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountEmailForm } from "@/features/account/account-email-form";
import styles from "@/features/account/account-settings.module.css";
import {
  hasRecentRenderLabTotpStepUp,
  isRenderLabMfaEnrolled,
  isRenderLabMfaFactorStateSupported,
} from "@/lib/auth/mfa-assurance";
import { getFreshCurrentRenderLabAuthentication } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EmailSettingsPage() {
  const authentication = await getFreshCurrentRenderLabAuthentication();
  if (!authentication?.identity.email) redirect("/settings?auth=signin_required");

  if (!isRenderLabMfaFactorStateSupported(authentication.assurance)) {
    redirect("/settings?auth=unavailable");
  }

  const mfaEnrolled = isRenderLabMfaEnrolled(authentication.assurance);
  if (mfaEnrolled && !hasRecentRenderLabTotpStepUp(authentication.assurance)) {
    redirect(`/settings/mfa/challenge?next=${encodeURIComponent("/settings/email")}`);
  }

  return (
    <section className={styles.workspace}>
      <header className={styles.intro}>
        <Link className={styles.backLink} href="/settings">← Settings</Link>
        <p className={styles.eyebrow}>Sign-in identity</p>
        <h1 className={styles.title}>Change sign-in email</h1>
        <p className={styles.lede}>
          Keep the same RenderLab account and ownership while replacing the email used to sign in. The current address remains active until both inbox confirmations succeed.
        </p>
      </header>

      <AccountEmailForm
        currentEmail={authentication.identity.email}
        requiresCurrentPassword={!mfaEnrolled}
      />
    </section>
  );
}
