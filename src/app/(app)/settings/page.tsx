import { AccountSettings } from "@/features/account/account-settings";
import styles from "@/features/account/account-settings.module.css";
import { isSupabaseAuthConfigured } from "@/lib/supabase/config";
import { getCurrentRenderLabIdentity, getCurrentRenderLabMfaAssurance } from "@/lib/supabase/server";
import {
  isRenderLabAccessEnforcementEnabled,
  resolveRenderLabAccountAccess,
  type RenderLabAccountAccess,
} from "@/server/account/account-access";

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function initialFeedback(params: Record<string, string | string[] | undefined>) {
  if (firstParam(params.password) === "updated") {
    return { kind: "success" as const, message: "Password updated." };
  }
  const auth = firstParam(params.auth);
  if (auth === "invitation_accepted") {
    return { kind: "success" as const, message: "Invitation accepted. Your RenderLab access is active." };
  }
  if (auth === "invitation_required") {
    return { kind: "error" as const, message: "This invitation cannot grant active RenderLab access." };
  }
  if (auth === "link_invalid") {
    return { kind: "error" as const, message: "That account link is invalid or has expired." };
  }
  if (auth === "signin_required") {
    return { kind: "error" as const, message: "Sign in to continue with that security action." };
  }
  if (auth === "unavailable") {
    return { kind: "error" as const, message: "Account verification is temporarily unavailable." };
  }
  return null;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const configured = isSupabaseAuthConfigured();
  const identity = configured ? await getCurrentRenderLabIdentity() : null;
  let access: RenderLabAccountAccess | null = null;

  if (identity) {
    try {
      access = await resolveRenderLabAccountAccess(identity);
    } catch {
      access = null;
    }
  }

  const assurance = identity ? await getCurrentRenderLabMfaAssurance() : null;
  const mfaState = !assurance
    ? "unavailable"
    : assurance.nextLevel !== "aal2"
      ? "disabled"
      : assurance.currentLevel === "aal2"
        ? "verified"
        : "verification-required";
  const showAdminLink = Boolean(identity && access?.status === "active" && access.role === "admin");

  const intro = !configured
    ? "Account access is unavailable in this runtime."
    : identity
      ? "Manage your account, access and security."
      : "Sign in to your invited RenderLab account.";

  return (
    <section className={styles.workspace}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Account security</p>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.lede}>{intro}</p>
      </header>

      <AccountSettings
        configured={configured}
        identity={identity}
        access={access}
        enforcementEnabled={isRenderLabAccessEnforcementEnabled()}
        initialFeedback={initialFeedback(params)}
        showAdminLink={showAdminLink}
        mfaState={mfaState}
      />
    </section>
  );
}
