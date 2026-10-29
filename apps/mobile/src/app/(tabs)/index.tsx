import { useRouter } from 'expo-router';
import { FoundationScreen } from '@/features/foundation/FoundationScreen';

export default function CreateRoute() {
  const router = useRouter();
  return (
    <FoundationScreen
      eyebrow="CREATIVE WORKSPACE · LIVE TEST"
      title="Create"
      description="A native starting point for image and video creation. Generation controls will arrive only after secure API and product flow validation."
      milestone="Navigation and maintained UI component smoke only. No generation request is sent."
      action={{ label: 'Open Library', onPress: () => router.navigate('/library') }}
    />
  );
}
