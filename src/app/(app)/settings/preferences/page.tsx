import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountPreferencesForm } from "@/features/account/account-preferences-form";
import styles from "@/features/account/account-settings.module.css";
import { getFreshCurrentRenderLabAuthentication } from "@/lib/supabase/server";
import { getRenderLabAccountAccess } from "@/server/account/account-access";
import { getRenderLabAccountPreferences } from "@/server/account/account-preferences";

export const dynamic = "force-dynamic";

export default async function PreferencesSettingsPage() {
  const authentication = await getFreshCurrentRenderLabAuthentication();
  if (!authentication) redirect("/settings?auth=signin_required");

  let access;
  try {
    access = await getRenderLabAccountAccess(authentication.identity.id);
  } catch {
    redirect("/settings?auth=unavailable");
  }
  if (!access) redirect("/settings?auth=invitation_required");

  let preferences;
  try {
    preferences = await getRenderLabAccountPreferences(authentication.identity.id);
  } catch {
    redirect("/settings?auth=unavailable");
  }

  return (
    <section className={styles.workspace}>
      <header className={styles.intro}>
        <Link className={styles.backLink} href="/settings">← Settings</Link>
        <p className={styles.eyebrow}>Preferences</p>
        <h1 className={styles.title}>Create defaults</h1>
        <p className={styles.lede}>
          Choose starting values for new Create drafts. Saved recipes, media continuations and existing work keep their own settings.
        </p>
      </header>
      <AccountPreferencesForm initialPreferences={preferences} />
    </section>
  );
}
