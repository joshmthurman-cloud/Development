import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Text, TextInput, Button, Snackbar } from 'react-native-paper';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { checkUsernameAvailable } from '@/api/profile';
import { colors, spacing, radius } from '@/theme';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const signUp = useAuthStore((s) => s.signUp);

  const checkUsername = useCallback(
    async (name: string) => {
      if (name.length < 3) {
        setUsernameAvailable(null);
        return;
      }
      setCheckingUsername(true);
      const available = await checkUsernameAvailable(name.trim());
      setUsernameAvailable(available);
      setCheckingUsername(false);
    },
    []
  );

  function handleUsernameChange(text: string) {
    const cleaned = text.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
    setUsername(cleaned);
    setUsernameAvailable(null);

    if (cleaned.length >= 3) {
      const timeout = setTimeout(() => checkUsername(cleaned), 500);
      return () => clearTimeout(timeout);
    }
  }

  async function handleSignup() {
    if (!email || !password || !username) {
      setError('All fields are required.');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (usernameAvailable === false) {
      setError('That username is taken. Pick another.');
      return;
    }

    setLoading(true);
    setError('');
    const result = await signUp(email.trim(), password, username.trim());
    setLoading(false);
    if (result.error) setError(result.error);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>
              Create Account
            </Text>
            <Text style={styles.subtitle}>
              Your username is public. Your email stays private.
            </Text>
          </View>

          <View style={styles.form}>
            <View>
              <TextInput
                label="Username"
                value={username}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
                mode="outlined"
                outlineColor={
                  usernameAvailable === false
                    ? colors.incorrect
                    : usernameAvailable === true
                    ? colors.correct
                    : colors.border
                }
                activeOutlineColor={colors.primary}
                textColor={colors.text}
                style={styles.input}
                right={
                  checkingUsername ? (
                    <TextInput.Icon icon="loading" />
                  ) : usernameAvailable === true ? (
                    <TextInput.Icon
                      icon="check-circle"
                      color={colors.correct}
                    />
                  ) : usernameAvailable === false ? (
                    <TextInput.Icon
                      icon="close-circle"
                      color={colors.incorrect}
                    />
                  ) : undefined
                }
                theme={{
                  colors: {
                    onSurfaceVariant: colors.textSecondary,
                    surfaceVariant: colors.surfaceVariant,
                  },
                }}
              />
              {usernameAvailable === false && (
                <Text style={styles.fieldError}>Username is taken</Text>
              )}
            </View>

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              textColor={colors.text}
              style={styles.input}
              theme={{
                colors: {
                  onSurfaceVariant: colors.textSecondary,
                  surfaceVariant: colors.surfaceVariant,
                },
              }}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              textColor={colors.text}
              style={styles.input}
              theme={{
                colors: {
                  onSurfaceVariant: colors.textSecondary,
                  surfaceVariant: colors.surfaceVariant,
                },
              }}
            />

            <Button
              mode="contained"
              onPress={handleSignup}
              loading={loading}
              disabled={loading}
              buttonColor={colors.primary}
              textColor="#FFFFFF"
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Create Account
            </Button>

            <Link href="/(auth)/login" asChild>
              <Button mode="text" textColor={colors.textSecondary}>
                Already have an account? Log In
              </Button>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        style={styles.snackbar}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.xxxl,
  },
  header: { gap: spacing.sm },
  title: { color: colors.text, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: 14 },
  form: { gap: spacing.lg },
  input: { backgroundColor: colors.surface },
  fieldError: { color: colors.incorrect, fontSize: 12, marginTop: 4, marginLeft: 4 },
  button: { borderRadius: radius.md, marginTop: spacing.sm },
  buttonContent: { paddingVertical: spacing.sm },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
  snackbar: { backgroundColor: colors.incorrect },
});
