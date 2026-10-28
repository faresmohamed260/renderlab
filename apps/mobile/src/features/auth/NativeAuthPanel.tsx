/**
 * Dormant native account presentation for the accepted Android M2 contract.
 * This component is intentionally NOT mounted in a route until owner-approved
 * public Auth configuration and a reviewed first-party admission transport.
 * It never stores credentials, tokens, or TOTP in persistence or diagnostics.
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { colors, radii, space } from '@/theme/tokens';
import type { NativeAuthStage } from '@/services/auth/native-auth-boundary';

type Props = Readonly<{
  stage: NativeAuthStage;
  errorMessage?: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onVerifyTotp: (code: string) => Promise<void>;
  onCancelMfa: () => void;
  onSignOut: () => Promise<void>;
}>;

export function NativeAuthPanel({
  stage, errorMessage, onSignIn, onVerifyTotp, onCancelMfa, onSignOut,
}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState('');
  const working = pending || stage === 'verifying_password'
    || stage === 'checking_factors' || stage === 'verifying_totp'
    || stage === 'checking_admission';
  const isMfa = stage === 'mfa_required' || stage === 'verifying_totp';
  const isSignedIn = stage === 'authorized';

  async function signIn() {
    if (working || stage !== 'signed_out' && stage !== 'access_denied') return;
    const safeEmail = email.trim();
    const submittedPassword = password;
    setPassword(''); // never retain password beyond submission
    setLocalError('');
    if (!safeEmail || !safeEmail.includes('@') || !submittedPassword) {
      setLocalError('Enter your email address and password.');
      return;
    }
    setPending(true);
    try {
      await onSignIn(safeEmail, submittedPassword);
    } catch {
      setLocalError('Sign-in could not be completed.');
    } finally {
      setPending(false);
    }
  }

  async function submitTotp() {
    if (working || stage !== 'mfa_required') return;
    const submittedCode = code;
    setCode(''); // never retain a code after submit, including an error
    setLocalError('');
    if (!/^[0-9]{6}$/.test(submittedCode)) {
      setLocalError('Enter the six-digit code from your authenticator app.');
      return;
    }
    setPending(true);
    try {
      await onVerifyTotp(submittedCode);
    } catch {
      setLocalError('The code could not be verified.');
    } finally {
      setPending(false);
    }
  }
  async function signOut() {
    if (working) return;
    setCode(''); setPassword(''); setEmail(''); setLocalError('');
    setPending(true);
    try {
      await onSignOut();
    } catch {
      setLocalError('Local sign-out must be confirmed before continuing.');
    } finally {
      setPending(false);
    }
  }

  const message = localError || errorMessage;
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.heading}>RenderLab account</Text>
        {stage === 'unavailable' ? (
          <Text style={styles.note} accessibilityRole="alert">
            Sign-in is unavailable in this build. Private content remains locked.
          </Text>
        ) : isSignedIn ? (
          <>
            <Text accessibilityRole="status" style={styles.note}>
              Account access confirmed by the RenderLab server.
            </Text>
            <Button accessibilityLabel="Sign out" isDisabled={working}
              onPress={() => { void signOut(); }}>
              <ButtonText>Sign out</ButtonText>
            </Button>
          </>
        ) : isMfa ? (
          <>
            <Text style={styles.note}>
              Enter the six-digit code from your existing authenticator app.
            </Text>
            <TextInput
              accessibilityLabel="Authenticator code"
              autoComplete="one-time-code"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              editable={!working}
              value={code}
              onChangeText={setCode}
              placeholder="6-digit code"
              placeholderTextColor={colors.textMuted}
              style={styles.field}
              returnKeyType="done"
              onSubmitEditing={() => { void submitTotp(); }}
            />
            <Button accessibilityLabel="Verify authenticator code" isDisabled={working}
              onPress={() => { void submitTotp(); }}>
              <ButtonText>{working ? 'Verifying…' : 'Verify code'}</ButtonText>
            </Button>
            <Button accessibilityLabel="Cancel authenticator challenge"
              variant="outline" isDisabled={working} onPress={() => {
                setCode(''); setLocalError(''); onCancelMfa();
              }}>
              <ButtonText>Cancel</ButtonText>
            </Button>
          </>
        ) : stage === 'signed_out' || stage === 'access_denied' ? (
          <>
            <Text style={styles.note}>
              Sign in with your existing RenderLab account. New account registration is unavailable.
            </Text>
            <View style={styles.fields}>
              <TextInput
                accessibilityLabel="Account email"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!working}
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor={colors.textMuted}
                style={styles.field}
              />
              <TextInput
                accessibilityLabel="Account password"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                secureTextEntry
                editable={!working}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                style={styles.field}
                returnKeyType="go"
                onSubmitEditing={() => { void signIn(); }}
              />
            </View>
            <Button accessibilityLabel="Sign in" isDisabled={working}
              onPress={() => { void signIn(); }}>
              <ButtonText>{working ? 'Signing in…' : 'Sign in'}</ButtonText>
            </Button>
          </>
        ) : (
          <Text accessibilityRole="status" style={styles.note}>
            Verifying your account access…
          </Text>
        )}
        {message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1, gap: space.md, backgroundColor: colors.canvas, padding: space.lg,
  },
  heading: { fontSize: 24, fontWeight: '700', color: colors.text },
  note: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  error: { color: colors.danger, fontSize: 14 },
  fields: { gap: space.sm },
  field: {
    minHeight: 48,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    backgroundColor: colors.surface1, color: colors.text,
    paddingHorizontal: space.md, fontSize: 16,
  },
});
