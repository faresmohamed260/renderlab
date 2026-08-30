import { notFound } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminOperations } from "@/features/admin/admin-operations";
import { getCurrentRenderLabAdmin } from "@/server/admin/admin-auth";
import { getAdminDashboard } from "@/server/admin/admin-operations";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getCurrentRenderLabAdmin();
  if (!admin) notFound();

  try {
    const snapshot = await getAdminDashboard(admin.identity.id);
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Operations</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text sm:text-3xl">Admin</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
            Manage RenderLab beta access, bounded per-account generation overrides, and sanitized product health.
          </p>
        </div>
        <AdminOperations snapshot={snapshot} actorUserId={admin.identity.id} />
      </section>
    );
  } catch {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Operations</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text sm:text-3xl">Admin</h1>
        </div>
        <Alert variant="destructive">
          <AlertDescription>Admin operations are temporarily unavailable.</AlertDescription>
        </Alert>
      </section>
    );
  }
}
