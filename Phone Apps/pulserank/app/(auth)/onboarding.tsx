import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { TierSelector } from '@/components/common/TierSelector';
import { TopicPicker } from '@/components/common/TopicPicker';
import type { KnowledgeLevel } from '@/types';
import { colors, spacing, radius } from '@/theme';

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [tier, setTier] = useState<KnowledgeLevel | null>(null);
  const [focusTopics, setFocusTopics] = useState<string[]>([]);
  const [avoidTopics, setAvoidTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  function toggleFocus(key: string) {
    setFocusTopics((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
    setAvoidTopics((prev) => prev.filter((t) => t !== key));
  }

  function toggleAvoid(key: string) {
    setAvoidTopics((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
    setFocusTopics((prev) => prev.filter((t) => t !== key));
  }

  async function handleComplete() {
    if (!tier) return;
    setLoading(true);
    const result = await completeOnboarding(tier, focusTopics, avoidTopics);
    setLoading(false);
    if (result.error) setError(result.error);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {step === 0 && (
          <View style={styles.section}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepLabel}>Step 1 of 2</Text>
              <Text variant="headlineSmall" style={styles.heading}>
                Select Your Knowledge Level
              </Text>
              <Text style={styles.subheading}>
                This determines your question difficulty and leaderboard.
              </Text>
            </View>

            <TierSelector selected={tier} onSelect={setTier} />

            <Button
              mode="contained"
              onPress={() => setStep(1)}
              disabled={!tier}
              buttonColor={colors.primary}
              textColor="#FFFFFF"
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Continue
            </Button>
          </View>
        )}

        {step === 1 && (
          <View style={styles.section}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepLabel}>Step 2 of 2</Text>
              <Text variant="headlineSmall" style={styles.heading}>
                Topic Preferences
              </Text>
              <Text style={styles.subheading}>
                Optional — customize what you see in your daily quiz.
              </Text>
            </View>

            <TopicPicker
              selected={focusTopics}
              onToggle={toggleFocus}
              label="Focus Topics (Practice More)"
            />

            <TopicPicker
              selected={avoidTopics}
              onToggle={toggleAvoid}
              label="Avoid Topics (Practice Less)"
            />

            {avoidTopics.length > 8 && (
              <Text style={styles.warning}>
                You've excluded a lot of topics. You may run out of questions.
              </Text>
            )}

            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={() => setStep(0)}
                textColor={colors.textSecondary}
                style={styles.backButton}
              >
                Back
              </Button>
              <Button
                mode="contained"
                onPress={handleComplete}
                loading={loading}
                disabled={loading}
                buttonColor={colors.primary}
                textColor="#FFFFFF"
                style={[styles.button, styles.flex]}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Start Learning
              </Button>
            </View>
          </View>
        )}
      </ScrollView>

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
  scroll: { flexGrow: 1, padding: spacing.xxl },
  section: { gap: spacing.xxl },
  stepHeader: { gap: spacing.sm },
  stepLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heading: { color: colors.text, fontWeight: '700' },
  subheading: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  button: { borderRadius: radius.md },
  buttonContent: { paddingVertical: spacing.sm },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
  backButton: { borderColor: colors.border, borderRadius: radius.md },
  buttonRow: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  warning: {
    color: colors.gold,
    fontSize: 13,
    backgroundColor: colors.gold + '12',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  snackbar: { backgroundColor: colors.incorrect },
});
