import { MediaViewer } from "@/features/library/media-viewer";
import { fixtureAsset, fixtureJobId } from "../../fixtures";

export default function FixtureViewer() {
  return <MediaViewer asset={fixtureAsset} collections={[]} collectionsAvailable={true}
    reuseRecipeJobId={fixtureJobId} compareSource={null} upscaleEligible={false} />;
}
