import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountMfaChallenge } from "@/features/account/account-mfa-challenge";
import styles from "@/features/account/account-settings.module.css";
import { renderLabSafeMfaNextPath } from "@/lib/auth/mfa-assurance";
import { getCurrentRenderLabIdentity } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MfaChallengePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getCurrentRenderLabIdentity();
  if (!identity) redirect("/settings?auth=signin_required");
  const params = await searchParams;
  const nextPath = renderLabSafeMfaNextPath(firstParam(params.next), "/settings");

  return (
    <section className={styles.workspace}>
      <header className={styles.intro}>
        <Link className={styles.backLink} href="/settings">
          ← Settings
        </Link>
        <p className={styles.eyebrow}>Step-up verification</p>
        <h1 className={styles.title}>Verify your authenticator</h1>
        <p className={styles.lede}>Complete a TOTP challenge before RenderLab continues to the protected destination.</p>
      </header>

      <AccountMfaChallenge nextPath={nextPath} />
    </section>
  );
}
