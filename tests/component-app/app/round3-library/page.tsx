import { LibraryView } from "@/features/library/library-view";
import { libraryProps, firstAsset, secondAsset } from "../../library-fixtures";

// Non-product artwork, deterministic and fully offline, for readable review tiles.
const art = (sky:string,land:string) => "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="'+sky+'"/><circle cx="355" cy="135" r="65" fill="#f3d9a2"/><path d="M0 380L150 180 260 355 400 230 512 370V512H0Z" fill="'+land+'"/></svg>'
);
const items = [firstAsset, secondAsset].map((asset,index)=>{
  const image= index===0 ? art("#7565b2","#302b59") : art("#c48d72","#604257");
  return {...asset,thumbnailUrl:image,contentUrl:image};
});
export default async function ReviewLibrary({searchParams}:{searchParams:Promise<{inspect?:string}>}) {
  const {inspect}=await searchParams;
  return <LibraryView {...libraryProps} items={items}
    inspectedAssetId={items.find(asset=>asset.id===inspect)?.id??null}
    reuseRecipeJobId={inspect===secondAsset.id?secondAsset.generationJobId:null} />;
}
