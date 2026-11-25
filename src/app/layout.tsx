import { envFlag, envString } from "../lib/config/runtime-env.ts";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PreviewNavigationBoundary } from "@/components/shell/preview-navigation-boundary";
import { getCurrentRenderLabIdentity } from "@/lib/supabase/server";
import { getRenderLabAccountProfile } from "@/server/account/account-profile";
import { getRenderLabProfileRequestOwner } from "@/server/account/account-profile-request";
import { getCurrentRenderLabAdminAuthorization } from "@/server/admin/admin-auth";
import { isCreatePreview } from "@/server/create-preview-mode";

import { inter } from "./fonts";
import "./globals.css";
import "./renderlab-background.css";
import "./create-clear-composer.css";

const title = "RenderLab — Image creation and editing workspace";
const description =
  "Create images, edit them with your references, and keep reusable media and generation history in one focused workspace.";

export const metadata: Metadata = {
  metadataBase: new URL("https://renderlab-lake.vercel.app"),
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const preview = envString("NODE_ENV") === "production" || await isCreatePreview();
  const account = preview ? await getCurrentRenderLabIdentity().catch(() => null) : null;
  // Navigation is not authorization. Reuse the existing fresh MFA/admin guard,
  // fail closed, and match the verified identity; never infer role from client profile data.
  const [admin, profileOwner] = account ? await Promise.all([
    getCurrentRenderLabAdminAuthorization().catch(() => null),
    getRenderLabProfileRequestOwner().catch(() => null),
  ]) : [null, null];
  const authorizedProfile = account && profileOwner?.ok && profileOwner.ownerId === account.id
    ? await getRenderLabAccountProfile(account.id).catch(() => null) : null;
  const profile = authorizedProfile ? { displayName: authorizedProfile.displayName, avatarUrl: authorizedProfile.avatarUrl } : null;
  const showAdmin = admin?.status === "authorized" && admin.admin.identity.id === account?.id;
  return (
    <html lang="en" className={inter.variable}>
      <body className={preview ? "renderlab-gradient" : undefined}>
        {preview && <div className="renderlab-reference-atmosphere" aria-hidden="true">
          <div className="renderlab-reference-wash" />
        </div>}
        {preview ? <PreviewNavigationBoundary accountId={account?.id ?? null} showAdmin={showAdmin} profile={profile} hostedProfile={envString("NODE_ENV") === "development" && envFlag("RENDERLAB_HOSTED_CREATE")}>{children}</PreviewNavigationBoundary> : children}
      </body>
    </html>
  );
}
