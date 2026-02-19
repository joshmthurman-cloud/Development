import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Switch, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { TierSelector } from '@/components/common/TierSelector';
import { TopicPicker } from '@/components/common/TopicPicker';
import type { KnowledgeLevel } from '@/types';
import { colors, spacing, radius } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, updateProfile, signOut } = useAuthStore();

  const [tier, setTier] = useState<KnowledgeLevel>(
    profile?.tier ?? 'layperson'
  );
  const [focusTopics, setFocusTopics] = useState<string[]>(
    profile?.focus_topics ?? []
  );
  const [avoidTopics, setAvoidTopics] = useState<string[]>(
    profile?.avoid_topics ?? []
  );
  const [notifyQuiz, setNotifyQuiz] = useState(
    profile?.notify_daily_quiz ?? true
  );
  const [notifyPoll, setNotifyPoll] = useState(profile?.notify_poll ?? true);
  const [notifyReminders, setNotifyReminders] = useState(
    profile?.notify_reminders ?? true
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDirty(true);
  }, [tier, focusTopics, avoidTopics, notifyQuiz, notifyPoll, notifyReminders]);

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

  async function handleSave() {
    setSaving(true);
    await updateProfile({
      tier,
      focus_topics: focusTopics,
      avoid_topics: avoidTopics,
      notify_daily_quiz: notifyQuiz,
      notify_poll: notifyPoll,
      notify_reminders: notifyReminders,
    });
    setSaving(false);
    setDirty(false);
    router.back();
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Settings',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.safe} edges={[]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Knowledge Level</Text>
            <TierSelector selected={tier} onSelect={setTier} />
          </View>

          <Divider style={styles.divider} />

          <View style={styles.section}>
            <TopicPicker
              selected={focusTopics}
              onToggle={toggleFocus}
              label="Focus Topics"
            />
          </View>

          <View style={styles.section}>
            <TopicPicker
              selected={avoidTopics}
              onToggle={toggleAvoid}
              label="Avoid Topics"
            />
          </View>

          <Divider style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.switchTitle}>Daily Quiz (12 PM ET)</Text>
              </View>
              <Switch
                value={notifyQuiz}
                onValueChange={setNotifyQuiz}
                color={colors.primary}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.switchTitle}>Poll Open (8 PM ET)</Text>
              </View>
              <Switch
                value={notifyPoll}
                onValueChange={setNotifyPoll}
                color={colors.primary}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.switchTitle}>Poll Reminder</Text>
              </View>
              <Switch
                value={notifyReminders}
                onValueChange={setNotifyReminders}
                color={colors.primary}
              />
            </View>
          </View>

          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving || !dirty}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
            style={styles.saveButton}
            contentStyle={styles.saveButtonContent}
            labelStyle={styles.saveButtonLabel}
          >
            Save Changes
          </Button>

          <Button
            mode="text"
            onPress={handleSignOut}
            textColor={colors.incorrect}
            style={styles.signOut}
          >
            Sign Out
          </Button>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxxl * 2 },
  section: { gap: spacing.md },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: { backgroundColor: colors.border },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchLabel: { flex: 1 },
  switchTitle: { color: colors.text, fontSize: 15 },
  saveButton: { borderRadius: radius.md, marginTop: spacing.md },
  saveButtonContent: { paddingVertical: spacing.sm },
  saveButtonLabel: { fontSize: 16, fontWeight: '700' },
  signOut: { marginTop: spacing.lg },
});
