/**
 * RenderLab native Settings/account surface. The M2 Auth adapter is genuinely
 * wired but compile-time DISABLED until Security/Owner approval of public
 * config, HTTPS bearer transport and real-device qualification.
 * A disabled build never creates a Supabase Auth client or accepts passwords.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRuntimeUiConfig } from '@/features/runtime-ui/RuntimeUiConfigProvider';
import { NativeAuthPanel } from '@/features/auth/NativeAuthPanel';
import {
  createNativeAuthCoordinator,
} from '@/services/auth/native-auth-coordinator';
import type { NativeAuthState } from '@/services/auth/native-auth-boundary';
import {
  createDormantNativeSupabaseAuthRuntime,
} from '@/services/auth/native-supabase-client';
import { colors, space } from '@/theme/tokens';

type Coordinator = ReturnType<typeof createNativeAuthCoordinator>;

export default function SettingsRoute() {
  const { brand } = useRuntimeUiConfig();
  const queryClient = useQueryClient();
  const ref = useRef<Coordinator | null>(null);
  const [state, setState] = useState<NativeAuthState>({ stage: 'unavailable' });
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    let mounted = true;
    const safeUpdate = (next: NativeAuthState) => {
      if (mounted) setState(next);
    };
    // Never retain previously authorized account data on a background switch,
    // refresh failure, or new identity. Public UI-config remains server-owned.
    const invalidate = () => {
      ref.current?.invalidate();
      queryClient.clear();
    };
    const runtime = createDormantNativeSupabaseAuthRuntime(
      invalidate,
      () => safeUpdate({ stage: 'unavailable' }),
      () => ref.current?.restore(),
      {
        invalidate: () => ref.current?.invalidate(),
        requestRestore: () => ref.current?.requestRestore(),
        getState: () => ref.current?.state ?? { stage: 'unavailable' },
      },
    );
    if (!runtime) {
      setCanRetry(false);
      safeUpdate({ stage: 'unavailable' });
      return () => { mounted = false; };
    }
    const coordinator = createNativeAuthCoordinator(
      runtime.port, runtime.probe, safeUpdate,
    );
    ref.current = coordinator;
    setCanRetry(true);
    safeUpdate(coordinator.state);
    try {
      runtime.start();
    } catch {
      runtime.stop();
      coordinator.invalidate();
      ref.current = null;
      setCanRetry(false);
      safeUpdate({ stage: 'unavailable' });
    }
    return () => {
      mounted = false;
      runtime.stop();
      coordinator.invalidate();
      queryClient.clear();
      if (ref.current === coordinator) ref.current = null;
    };
  }, [queryClient]);

  async function signIn(email: string, password: string) {
    if (!ref.current) throw new Error('Native sign-in disabled');
    await ref.current.signIn({ email, password });
  }
  async function verifyTotp(code: string) {
    if (!ref.current) throw new Error('Native authenticator unavailable');
    const controller = ref.current;
    await controller.verifyTotp(code);
    return controller.state.stage === 'authorized';
  }
  function retry() {
    const controller = ref.current;
    if (controller) controller.requestRestore();
  }
  async function signOut() {
    if (!ref.current) throw new Error('Native sign-out unavailable');
    queryClient.clear();
    await ref.current.signOut();
  }
  function cancelMfa() {
    const controller = ref.current;
    if (!controller) return;
    queryClient.clear();
    void controller.signOut().catch(() => setState({ stage: 'unavailable' }));
  }
  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.brand}>{brand}</Text>
        <Text accessibilityRole="header" style={styles.heading}>Settings</Text>
        <Text style={styles.subtext}>
          Account and security
        </Text>
      </View>
      <NativeAuthPanel
        stage={state.stage}
        onSignIn={signIn}
        onVerifyTotp={verifyTotp}
        onCancelMfa={cancelMfa}
        onSignOut={signOut}
        onRetry={canRetry ? retry : undefined}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  top: { paddingTop: space.lg, paddingHorizontal: space.lg, gap: space.sm },
  brand: { color: colors.accent, fontSize: 12, letterSpacing: 3, fontWeight: '700' },
  heading: { color: colors.text, fontSize: 28, fontWeight: '700' },
  subtext: { color: colors.textMuted, fontSize: 14 },
});
