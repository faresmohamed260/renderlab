import { cookies } from "next/headers";
import { MediaViewer } from "@/features/library/media-viewer";
import { firstAsset, secondAsset, collection } from "../../../library-fixtures";

export default async function FixtureViewer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await cookies();
  const asset = id === firstAsset.id ? {
    ...firstAsset,
    displayName: state.get("fixture-name")?.value ?? firstAsset.displayName,
    isFavorite: state.get("fixture-favorite")?.value === "1",
  } : secondAsset;
  const membership = { ...collection, containsAsset: id === firstAsset.id && state.get("fixture-membership")?.value === "1" };
  return <MediaViewer asset={asset} collections={[membership]} collectionsAvailable={true}
    reuseRecipeJobId={asset.generationJobId} compareSource={null} upscaleEligible={false} />;
}
