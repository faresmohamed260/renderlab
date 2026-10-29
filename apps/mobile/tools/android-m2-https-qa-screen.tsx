/**
 * Android M2 one-off HTTPS redirect proof. DISPOSABLE QA ONLY.
 * CI temporarily replaces Settings with this screen during an isolated build.
 * Do not ship this route, trust test CAs in a production build, or use real tokens.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { colors, space } from '@/theme/tokens';

const BASE = 'https://10.0.2.2:18765';
const HEADER = 'Bearer M2-HTTPS-SYNTHETIC-NO-CREDENTIALS';

type Case = 'OK' | '302 SAME' | '302 CROSS' | '307 CROSS' | 'DOWNGRADE';
const routes: Record<Case, string> = {
  OK: '/ok',
  '302 SAME': '/same-302',
  '302 CROSS': '/cross-302',
  '307 CROSS': '/cross-307',
  DOWNGRADE: '/downgrade-302',
};

export default function SyntheticHttpsRedirectQaScreen() {
  const [result, setResult] = useState('M2 HTTPS QA READY');
  const [running, setRunning] = useState(false);
  async function probe(which: Case) {
    if (running) return;
    setRunning(true);
    setResult('M2 HTTPS QA RUNNING ' + which);
    try {
      // Identical bearer/redirect option as native-profile-admission.ts.
      // A successful TLS /ok request proves QA certificate trust really worked.
      // A 3xx returned without following is an acceptable refused redirect.
      const response = await fetch(BASE + routes[which], {
        method: 'GET',
        redirect: 'error',
        credentials: 'omit',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Authorization: HEADER,
        },
      });
      if (which === 'OK') {
        setResult(response.status === 200 ? 'M2 HTTPS QA TLS 200'
          : 'M2 HTTPS QA TLS FAILED');
      } else {
        setResult(response.status >= 300 && response.status < 400
          ? 'M2 HTTPS QA REFUSED ' + which
          : 'M2 HTTPS QA FOLLOWED ' + which);
      }
    } catch {
      setResult(which === 'OK' ? 'M2 HTTPS QA TLS FAILED'
        : 'M2 HTTPS QA REFUSED ' + which);
    } finally {
      setRunning(false);
    }
  }
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>M2 HTTPS REDIRECT QA ONLY</Text>
      <Text style={styles.note}>Local disposable TLS certificate; synthetic bearer only.</Text>
      <Text accessibilityLiveRegion="polite" style={styles.result}>{result}</Text>
      {(['OK', '302 SAME', '302 CROSS', '307 CROSS', 'DOWNGRADE'] as const).map(which => (
        <Button key={which} isDisabled={running} accessibilityLabel={'Test HTTPS ' + which}
          onPress={() => { void probe(which); }}>
          <ButtonText>Test HTTPS {which}</ButtonText>
        </Button>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flexGrow: 1, gap: space.md, padding: space.xl, backgroundColor: colors.canvas },
  title: { color: colors.text, fontSize: 21, fontWeight: '700' },
  note: { color: colors.textMuted, fontSize: 13 },
  result: { color: colors.text, fontSize: 16, marginVertical: space.sm },
});
