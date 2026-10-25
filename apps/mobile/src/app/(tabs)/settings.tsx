import { FoundationScreen } from '@/features/foundation/FoundationScreen';

export default function SettingsRoute() {
  return (
    <FoundationScreen
      eyebrow="DEVICE PREFERENCES"
      title="Settings"
      description="Account, security, and device-specific preferences will follow reviewed native authentication and accessibility work."
      milestone="No account credentials, session tokens, or live settings are persisted."
    />
  );
}
