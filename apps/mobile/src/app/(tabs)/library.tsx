import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import {
  probeRenderLabProductionGuest,
  type GuestProductionResult,
} from '@/services/api/production-guest';
import { colors, radii, space } from '@/theme/tokens';

type ProbeState = GuestProductionResult | { state: 'checking' };

/**
 * A real production-endpoint connectivity milestone, not a private Library
 * or a synthetic-media feed. Native Auth/MFA and signed media are still gated.
 */
export default function LibraryRoute() {
  const [status, setStatus] = useState<ProbeState>({ state: 'checking' });
  const runProbe = useCallback(async () => {
    setStatus({ state: 'checking' });
    const outcome = await probeRenderLabProductionGuest();
    setStatus(outcome);
  }, []);

  useEffect(() => {
    let active = true;
    void probeRenderLabProductionGuest().then(outcome => {
      if (active) setStatus(outcome);
    });
    return () => { active = false; };
  }, []);

  const message =
    status.state === 'checking' ? 'Checking the existing RenderLab server…'
    : status.state === 'protected' ? 'Connected. The production Library requires your RenderLab sign-in.'
    : status.state === 'unavailable' ? 'Unable to reach RenderLab. Check your connection and retry.'
    : 'The server returned an unexpected response. No private data was requested.';

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.content}>
        <Text style={styles.brand}>RenderLab</Text>
        <Text accessibilityRole="header" style={styles.title}>Library</Text>
        <Text style={styles.subtitle}>Your generated and uploaded media, from the existing RenderLab account.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>PRODUCTION CONNECTION</Text>
          <Text
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            style={[styles.status, status.state === 'protected' && styles.good]}
          >
            {status.state === 'checking' ? 'Checking…'
              : status.state === 'protected' ? 'Server reached · Protected'
              : status.state === 'unavailable' ? 'Connection unavailable' : 'Verification required'}
          </Text>
          <Text style={styles.message}>{message}</Text>
          <Button
            disabled={status.state === 'checking'}
            accessibilityLabel="Check production connection again"
            onPress={() => { void runProbe(); }}
          >
            <ButtonText>Check connection</ButtonText>
          </Button>
        </View>
        <Text style={styles.note}>
          Native sign-in, MFA and private media loading are not enabled in this build.
          This check uses no credentials or mock media. It does not sign you in.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: space.lg, backgroundColor: colors.canvas },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingTop: space.xl },
  brand: { color: colors.text, fontSize: 25, fontWeight: '700' },
  title: { color: colors.text, fontSize: 30, fontWeight: '700', marginTop: space.xl },
  subtitle: { color: colors.textMuted, fontSize: 16, lineHeight: 24, marginTop: space.sm },
  card: {
    marginTop: space.xl, borderColor: colors.border, borderWidth: 1,
    borderRadius: radii.lg, padding: space.lg, backgroundColor: colors.surface1, gap: space.md,
  },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  status: { color: colors.text, fontSize: 19, fontWeight: '600' },
  good: { color: colors.success },
  message: { color: colors.textMuted, fontSize: 15, lineHeight: 23 },
  note: { color: colors.textMuted, fontSize: 13, lineHeight: 21, marginTop: space.lg },
});
