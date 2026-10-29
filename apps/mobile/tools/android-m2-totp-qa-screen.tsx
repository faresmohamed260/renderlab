/** Only copied over Settings during isolated emulator CI. NEVER shipped. */
import { useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeAuthPanel } from '@/features/auth/NativeAuthPanel';
import { createNativeAuthCoordinator } from '@/services/auth/native-auth-coordinator';
import type { NativeAuthState } from '@/services/auth/native-auth-boundary';
import { colors, space } from '@/theme/tokens';

const factor = { id: '22222222-2222-4222-8222-222222222222', status: 'verified', factor_type: 'totp' };
export default function SyntheticTotpQaRoute() {
  const [state, setState] = useState<NativeAuthState>({ stage: 'signed_out' });
  const controllerRef = useRef<ReturnType<typeof createNativeAuthCoordinator> | null>(null);
  if (!controllerRef.current) {
    let aal2 = false;
    controllerRef.current = createNativeAuthCoordinator({
      async signIn() { aal2 = false; return true; },
      async verifySession() { return false; },
      async getAssurance() { return { currentLevel: aal2 ? 'aal2' : 'aal1', nextLevel: 'aal2' }; },
      async listFactors() { return { all: [factor], totp: [factor] }; },
      async verifyTotp(id, code) {
        if (id !== factor.id || code !== '123456') return false;
        aal2 = true; return true;
      },
      async getAccessToken() { return aal2 ? 'SYNTHETIC-NOT-SENT' : null; },
      async signOutRemote() { aal2 = false; },
      async clearProtectedSession() { /* no storage ever used */ },
    }, async () => ({
      url: 'https://renderlab.faresuniform.uk/api/account/profile',
      status: 200,
      body: { ok: true, profile: {}, policy: {} },
    }), setState);
  }
  const controller = controllerRef.current;
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>M2 SYNTHETIC TOTP QA</Text>
      <Text style={styles.note}>Offline fixture. No real authentication or API calls.</Text>
      <Text accessibilityLiveRegion="polite" style={styles.note}>M2 QA STAGE: {state.stage}</Text>
      <NativeAuthPanel
        stage={state.stage}
        onSignIn={async (email, password) => { await controller.signIn({ email, password }); }}
        onVerifyTotp={async code => {
          await controller.verifyTotp(code);
          return controller.state.stage === 'authorized';
        }}
        onCancelMfa={() => { void controller.signOut(); }}
        onSignOut={async () => { await controller.signOut(); }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingTop: space.lg },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, paddingHorizontal: space.lg },
  note: { fontSize: 12, color: colors.textMuted, paddingHorizontal: space.lg },
});
