/**
 * DEVICE-ONLY synthetic multi-chunk SecureStore QA. NEVER mounted in a release.
 * CI replaces Settings with this test screen in a disposable checkout.
 */
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Button, ButtonText } from '@/components/ui/button';
import { createNativeSupabaseSecureStorage, NATIVE_SUPABASE_AUTH_STORAGE_KEY } from '@/services/auth/native-supabase-storage';
import { colors, space } from '@/theme/tokens';

const PROOF = JSON.stringify({
  marker: 'M2-CHUNKS-SYNTHETIC-NEVER-A-CREDENTIAL',
  access_token: 'QA-only-no-bearer.'.repeat(560),
  refresh_token: 'QA-only-not-a-refresh-token',
  user: '🎨'.repeat(320),
});
const adapter = {
  getItemAsync: (key: string) => SecureStore.getItemAsync(key),
  setItemAsync: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  deleteItemAsync: (key: string) => SecureStore.deleteItemAsync(key),
};

export default function M2ChunkQaScreen() {
  const storage = useMemo(() => createNativeSupabaseSecureStorage(adapter), []);
  const [status, setStatus] = useState('M2 CHUNK QA LOADING');
  useEffect(() => {
    let mounted = true;
    void storage.getItem(NATIVE_SUPABASE_AUTH_STORAGE_KEY)
      .then(value => {
        if (mounted) setStatus(value === null ? 'M2 CHUNK QA EMPTY'
          : value === PROOF ? 'M2 CHUNK QA PRESENT' : 'M2 CHUNK QA INVALID');
      })
      .catch(() => { if (mounted) setStatus('M2 CHUNK QA STORAGE ERROR'); });
    return () => { mounted = false; };
  }, [storage]);
  async function save() {
    setStatus('M2 CHUNK QA WRITING');
    try {
      await storage.setItem(NATIVE_SUPABASE_AUTH_STORAGE_KEY, PROOF);
      const reread = await storage.getItem(NATIVE_SUPABASE_AUTH_STORAGE_KEY);
      setStatus(reread === PROOF ? 'M2 CHUNK QA STORED' : 'M2 CHUNK QA INVALID');
    } catch {
      setStatus('M2 CHUNK QA STORAGE ERROR');
    }
  }
  async function clear() {
    setStatus('M2 CHUNK QA CLEARING');
    try {
      await storage.removeItem(NATIVE_SUPABASE_AUTH_STORAGE_KEY);
      const reread = await storage.getItem(NATIVE_SUPABASE_AUTH_STORAGE_KEY);
      setStatus(reread === null ? 'M2 CHUNK QA EMPTY' : 'M2 CHUNK QA INVALID');
    } catch {
      setStatus('M2 CHUNK QA STORAGE ERROR');
    }
  }
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.heading}>M2 CHUNK DEVICE QA</Text>
      <Text style={styles.marker}>{status}</Text>
      <View style={styles.controls}>
        <Button accessibilityLabel="Save synthetic chunks" onPress={() => { void save(); }}>
          <ButtonText>Save synthetic chunks</ButtonText>
        </Button>
        <Button accessibilityLabel="Clear synthetic chunks" onPress={() => { void clear(); }}>
          <ButtonText>Clear synthetic chunks</ButtonText>
        </Button>
      </View>
      <Text style={styles.footer}>DISPOSABLE QA ONLY · NO ACCOUNT OR API REQUESTS</Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, backgroundColor: colors.canvas, padding: space.xl, gap: space.lg },
  heading: { color: colors.text, fontWeight: '700', fontSize: 20 },
  marker: { color: colors.text, fontSize: 17 },
  controls: { gap: space.md },
  footer: { color: colors.textMuted, fontSize: 12 },
});
