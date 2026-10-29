/**
 * DISPOSABLE EMULATOR QA FIXTURE. Not a product screen or sign-in mechanism.
 * CI swaps this into Settings only in a disposable checkout before Android prebuild.
 * It never requests a real API, never handles a real token and must not ship.
 */
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Button, ButtonText } from '@/components/ui/button';
import { createGuardedNativeSessionStore } from '@/services/auth/native-session-storage';
import { colors, space } from '@/theme/tokens';

const PROOF = 'M2-SYNTHETIC-DEVICE-PROOF-NO-CREDENTIALS';
const storeAdapter = {
  getItemAsync: (key: string) => SecureStore.getItemAsync(key),
  setItemAsync: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  deleteItemAsync: (key: string) => SecureStore.deleteItemAsync(key),
};

export default function M2DeviceProof() {
  const store = useMemo(() => createGuardedNativeSessionStore(storeAdapter), []);
  const [storageState, setStorageState] = useState('M2 QA STORAGE LOADING');
  const [redirectState, setRedirectState] = useState('M2 QA REDIRECT NOT TESTED');

  useEffect(() => {
    let active = true;
    void store.read()
      .then((value) => { if (active) setStorageState(value === null ? 'M2 QA STORAGE EMPTY'
        : value === PROOF ? 'M2 QA STORAGE PRESENT' : 'M2 QA STORAGE INVALID'); })
      .catch(() => { if (active) setStorageState('M2 QA STORAGE ERROR'); });
    return () => { active = false; };
  }, [store]);

  const save = async () => {
    setStorageState('M2 QA STORAGE WRITING');
    try {
      await store.write(PROOF);
      setStorageState((await store.read()) === PROOF ? 'M2 QA STORAGE STORED' : 'M2 QA STORAGE INVALID');
    } catch {
      setStorageState('M2 QA STORAGE ERROR');
    }
  };
  const clear = async () => {
    setStorageState('M2 QA STORAGE CLEARING');
    try {
      await store.clear();
      setStorageState((await store.read()) === null ? 'M2 QA STORAGE EMPTY' : 'M2 QA STORAGE INVALID');
    } catch {
      setStorageState('M2 QA STORAGE ERROR');
    }
  };
  const redirect = async () => {
    setRedirectState('M2 QA REDIRECT TESTING');
    try {
      // Entirely local emulator->runner pair of HTTP servers; the bearer
      // is synthetic and no production origin is contacted. Runtime behavior
      // is recorded by both servers, NOT inferred from response.url.
      const response = await fetch('http://10.0.2.2:18765/start', {
        method: 'GET',
        redirect: 'error',
        headers: { Authorization: 'Bearer M2-SYNTHETIC-ONLY' },
      });
      setRedirectState(response.status === 200 ? 'M2 QA REDIRECT RESOLVED'
        : 'M2 QA REDIRECT RESPONSE');
    } catch {
      setRedirectState('M2 QA REDIRECT REJECTED');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>M2 QA DEVICE PROOF</Text>
      <Text style={styles.marker}>{storageState}</Text>
      <View style={styles.controls}>
        <Button accessibilityLabel="Save synthetic" onPress={() => { void save(); }}>
          <ButtonText>Save synthetic</ButtonText>
        </Button>
        <Button accessibilityLabel="Clear synthetic" onPress={() => { void clear(); }}>
          <ButtonText>Clear synthetic</ButtonText>
        </Button>
      </View>
      <Text style={styles.marker}>{redirectState}</Text>
      <Button accessibilityLabel="Test synthetic redirect" onPress={() => { void redirect(); }}>
        <ButtonText>Test synthetic redirect</ButtonText>
      </Button>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, backgroundColor: colors.canvas, padding: space.xl, gap: space.lg },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  marker: { color: colors.text, fontSize: 16 },
  controls: { gap: space.md },
});
