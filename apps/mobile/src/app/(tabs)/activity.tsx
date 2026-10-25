import { FoundationScreen } from '@/features/foundation/FoundationScreen';

export default function ActivityRoute() {
  return (
    <FoundationScreen
      eyebrow="GENERATION HISTORY"
      title="Activity"
      description="Job progress and history will be added after authenticated API, lifecycle, and revocation checks."
      milestone="No background job polling or worker connectivity is enabled."
    />
  );
}
