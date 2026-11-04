import '../../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  }));

  return (
    <QueryClientProvider client={client}>
      <GluestackUIProvider mode="dark">
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </GluestackUIProvider>
    </QueryClientProvider>
  );
}
