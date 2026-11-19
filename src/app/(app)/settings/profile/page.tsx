import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountProfileForm } from "@/features/account/account-profile-form";
import styles from "@/features/account/account-settings.module.css";
import { isRenderLabMfaChallengeRequired } from "@/lib/auth/mfa-assurance";
import { getFreshCurrentRenderLabAuthentication } from "@/lib/supabase/server";
import { getRenderLabAccountAccess } from "@/server/account/account-access";
import { getRenderLabAccountProfile } from "@/server/account/account-profile";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const authentication = await getFreshCurrentRenderLabAuthentication();
  if (!authentication) redirect("/settings?auth=signin_required");
  if (isRenderLabMfaChallengeRequired(authentication.assurance)) {
    redirect(`/settings/mfa/challenge?next=${encodeURIComponent("/settings/profile")}`);
  }

  let access;
  try {
    access = await getRenderLabAccountAccess(authentication.identity.id);
  } catch {
    redirect("/settings?auth=unavailable");
  }
  if (!access) redirect("/settings?auth=invitation_required");

  let profile;
  try {
    profile = await getRenderLabAccountProfile(authentication.identity.id);
  } catch {
    redirect("/settings?auth=unavailable");
  }

  return (
    <section className={styles.workspace}>
      <header className={styles.intro}>
        <Link className={styles.backLink} href="/settings">← Settings</Link>
        <p className={styles.eyebrow}>Account</p>
        <h1 className={styles.title}>Edit profile</h1>
        <p className={styles.lede}>Manage private display identity. Profile changes do not change sign-in, access, role or ownership.</p>
      </header>
      <AccountProfileForm initialProfile={profile} />
    </section>
  );
}
