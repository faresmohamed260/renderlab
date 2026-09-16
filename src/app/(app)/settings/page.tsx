import { AccountSettings } from "@/features/account/account-settings";
import styles from "@/features/account/account-settings.module.css";
import { isSupabaseAuthConfigured } from "@/lib/supabase/config";
import {
  getCurrentRenderLabIdentity,
  getFreshCurrentRenderLabAuthentication,
} from "@/lib/supabase/server";
import {
  isRenderLabAccessEnforcementEnabled,
  resolveRenderLabAccountAccess,
  type RenderLabAccountAccess,
} from "@/server/account/account-access";
import { getRenderLabSessionSummaries } from "@/server/account/account-sessions";
import { getRenderLabAccountProfile, type RenderLabAccountProfile } from "@/server/account/account-profile";

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
  if (auth === "email_change_confirmation_pending") {
    return { kind: "success" as const, message: "One email confirmation was accepted. Confirm the change from the other inbox to finish." };
  }
  if (auth === "email_changed") {
    return { kind: "success" as const, message: "Sign-in email updated. RenderLab ownership and access remain attached to the same account." };
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
  const authentication = configured ? await getFreshCurrentRenderLabAuthentication() : null;
  const identity = authentication?.identity ?? (configured ? await getCurrentRenderLabIdentity() : null);
  let access: RenderLabAccountAccess | null = null;

  if (identity) {
    try {
      access = await resolveRenderLabAccountAccess(identity);
    } catch {
      access = null;
    }
  }

  const assurance = authentication?.assurance ?? null;
  const sessions = authentication
    ? await getRenderLabSessionSummaries(authentication.identity.id, authentication.sessionId)
    : null;
  const mfaState = !assurance
    ? "unavailable"
    : assurance.nextLevel !== "aal2"
      ? "disabled"
      : assurance.currentLevel === "aal2"
        ? "verified"
        : "verification-required";
  let profile: RenderLabAccountProfile | null = null;
  if (identity && access && (mfaState === "disabled" || mfaState === "verified")) {
    try {
      profile = await getRenderLabAccountProfile(identity.id);
    } catch {
      profile = null;
    }
  }

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
        sessions={sessions}
        profile={profile}
      />
    </section>
  );
}
