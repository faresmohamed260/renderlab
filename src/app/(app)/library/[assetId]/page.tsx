import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MediaViewer } from "@/features/library/media-viewer";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/server/data/supabase-rest";
import { loadInitialGenerationRecipe } from "@/server/generation/generation-recipe";
import { getMediaAsset, publicMediaAsset } from "@/server/media/media-assets";
import { listMediaCollections } from "@/server/media/media-collections";
import { isR2Configured } from "@/server/storage/r2";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function MediaViewerPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;

  if (!uuidPattern.test(assetId)) notFound();

  const account = await getCurrentRenderLabAccount();
  if (!account) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 pb-28 pt-12 sm:px-8 sm:pb-16 sm:pt-16">
        <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-text">Media Viewer</h2>
        <div className="mt-6 rounded-xl border border-border bg-surface-1 px-5 py-8 text-sm text-text-muted" role="status">
          <p>Sign in to view private RenderLab media.</p>
          <Button asChild variant="secondary" className="mt-4">
            <Link href="/settings">Open Settings</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!isSupabaseConfigured() || !isR2Configured()) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 pb-28 pt-12 sm:px-8 sm:pb-16 sm:pt-16">
        <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-text">Media Viewer</h2>
        <div className="mt-6 rounded-xl border border-border bg-surface-1 px-5 py-8 text-sm text-text-muted" role="status">
          Media assets are not connected in this environment yet.
        </div>
      </section>
    );
  }

  const asset = await getMediaAsset(account.id, assetId).catch(() => null);
  if (!asset) notFound();

  const collections = await listMediaCollections(account.id, asset.id).catch(() => null);
  const reusableRecipe = asset.generation_job_id
    ? await loadInitialGenerationRecipe(account.id, asset.generation_job_id).catch(() => null)
    : null;

  return (
    <MediaViewer
      asset={publicMediaAsset(asset)}
      collections={collections ?? []}
      collectionsAvailable={collections !== null}
      reuseRecipeJobId={reusableRecipe?.jobId ?? null}
    />
  );
}
