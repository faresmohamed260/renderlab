import { cookies } from "next/headers";
import { LibraryView } from "@/features/library/library-view";
import { firstAsset, libraryProps, secondAsset } from "../../library-fixtures";

export default async function FixtureLibrary({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; inspect?: string }>;
}) {
  const { q, inspect } = await searchParams;
  const state = await cookies();
  const items = libraryProps.items.map((asset) => asset.id === firstAsset.id ? {
    ...asset,
    displayName: state.get("fixture-name")?.value ?? asset.displayName,
    isFavorite: state.get("fixture-favorite")?.value === "1",
  } : asset);
  return (
    <LibraryView
      {...libraryProps}
      items={items}
      searchQuery={q ?? null}
      inspectedAssetId={items.find((asset) => asset.id === inspect)?.id ?? null}
      reuseRecipeJobId={inspect === secondAsset.id ? secondAsset.generationJobId : null}
    />
  );
}
