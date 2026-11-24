import { LibraryView } from "@/features/library/library-view";
import { libraryProps } from "../../library-fixtures";

export default function FixtureLibrary() {
  return <LibraryView {...libraryProps} />;
}
