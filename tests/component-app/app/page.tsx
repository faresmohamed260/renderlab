import { CreatePreviewWorkspace } from "@/features/create/create-preview-workspace";
import { createProps } from "../fixtures";

export default function FixtureCreate() {
  return <CreatePreviewWorkspace {...createProps} />;
}
