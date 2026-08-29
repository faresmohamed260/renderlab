import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountPasswordForm } from "@/features/account/account-password-form";
import { getCurrentRenderLabIdentity } from "@/lib/supabase/server";
import {
  isPasswordRecoveryMarkerValid,
  PASSWORD_RECOVERY_COOKIE_NAME,
} from "@/server/account/recovery-flow";

export const dynamic = "force-dynamic";

export default async function PasswordSettingsPage() {
  const identity = await getCurrentRenderLabIdentity();
  if (!identity?.email) redirect("/settings?auth=signin_required");

  const cookieStore = await cookies();
  const recoveryMode = isPasswordRecoveryMarkerValid(
    cookieStore.get(PASSWORD_RECOVERY_COOKIE_NAME)?.value,
    identity.id,
  );

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-6 flex flex-col gap-2">
        <Link className="w-fit text-sm font-medium text-text-muted hover:text-text" href="/settings">
          ← Settings
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {recoveryMode ? "Set a new password" : "Change password"}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-text-muted">
          {recoveryMode
            ? "Choose a new password for the account verified by your recovery link."
            : "Confirm your current password before replacing it with a new one."}
        </p>
      </div>
      <AccountPasswordForm email={identity.email} recoveryMode={recoveryMode} />
    </section>
  );
}
