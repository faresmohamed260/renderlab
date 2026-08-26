import { RoutePlaceholder } from "@/components/shell/route-placeholder";

export default function ActivityPage() {
  return (
    <RoutePlaceholder
      eyebrow="Activity"
      title="Generation activity"
      description="Running, queued, completed, and failed generation work will be represented here using real job state. Infrastructure routing and failover remain internal."
    />
  );
}
