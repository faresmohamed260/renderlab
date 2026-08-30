import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AccountSettings } from "@/features/account/account-settings";
import { isSupabaseAuthConfigured } from "@/lib/supabase/config";
import { getCurrentRenderLabIdentity } from "@/lib/supabase/server";
import {
  isRenderLabAccessEnforcementEnabled,
  resolveRenderLabAccountAccess,
  type RenderLabAccountAccess,
} from "@/server/account/account-access";
import { getCurrentRenderLabAdmin } from "@/server/admin/admin-auth";

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

  const admin = access?.status === "active" && access.role === "admin"
    ? await getCurrentRenderLabAdmin()
    : null;
  const showAdminLink = admin?.identity.id === identity?.id;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Account</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text sm:text-3xl">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
          Sign in to access private RenderLab work, recover your password, and review closed-beta admission status.
        </p>
      </div>

      <SettingsSection title="Account" description="Identity, password security and closed-beta access status.">
        <AccountSettings
          configured={configured}
          identity={identity}
          access={access}
          enforcementEnabled={isRenderLabAccessEnforcementEnabled()}
          initialFeedback={initialFeedback(params)}
        />
      </SettingsSection>

      {showAdminLink ? (
        <SettingsSection
          title="Admin"
          description="Privileged RenderLab access, generation override and product-health operations."
        >
          <div className="rounded-xl border border-border bg-surface-1 p-5 sm:p-6">
            <p className="text-sm font-semibold text-text">Admin operations</p>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Your active RenderLab admin role can open the separate operations surface.
            </p>
            <Button asChild variant="secondary" className="mt-4">
              <Link href="/admin">Open Admin</Link>
            </Button>
          </div>
        </SettingsSection>
      ) : null}
    </section>
  );
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-border py-6 sm:grid-cols-[13rem_1fr] sm:gap-8">
      <div>
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-text-muted">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}
