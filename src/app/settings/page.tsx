import { AccountSettings } from "@/features/account/account-settings";
import { isSupabaseAuthConfigured } from "@/lib/supabase/config";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const configured = isSupabaseAuthConfigured();
  const account = configured ? await getCurrentRenderLabAccount() : null;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Settings</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text sm:text-[28px]">Account</h2>
        <p className="mt-3 text-sm leading-6 text-text-muted">
          Sign in to establish your RenderLab identity. Personal media ownership and Library organization will build on this account boundary in later slices.
        </p>
      </div>

      <div className="mt-7">
        <AccountSettings configured={configured} account={account} />
      </div>
    </section>
  );
}
