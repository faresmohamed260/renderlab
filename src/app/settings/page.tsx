import { RoutePlaceholder } from "@/components/shell/RoutePlaceholder";

export default function SettingsPage() {
  return (
    <RoutePlaceholder
      eyebrow="Settings"
      title="Application settings"
      description="Only persistent product and account preferences backed by real requirements will be added here. Workflow tuning controls do not belong in this surface."
    />
  );
}
