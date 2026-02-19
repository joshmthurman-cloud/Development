import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useQuizStatus } from '@/hooks/useDailyQuiz';
import { StatusCard } from '@/components/common/StatusCard';
import { StatTile } from '@/components/common/StatTile';
import { TierPill } from '@/components/common/TierPill';
import { CountdownChip } from '@/components/common/CountdownChip';
import { colors, spacing, radius } from '@/theme';
import { Assets } from '@/assets';

function getQuizUnlockTime(): Date {
  const now = new Date();
  const et = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  const unlock = new Date(et);
  unlock.setHours(12, 0, 0, 0);
  if (et >= unlock) return now;
  const diff = unlock.getTime() - et.getTime();
  return new Date(now.getTime() + diff);
}

function getPollTimes() {
  const now = new Date();
  const et = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  const open = new Date(et);
  open.setHours(20, 0, 0, 0);
  const close = new Date(et);
  close.setHours(22, 0, 0, 0);

  const diffOpen = open.getTime() - et.getTime();
  const diffClose = close.getTime() - et.getTime();

  return {
    opensAt: new Date(now.getTime() + diffOpen),
    closesAt: new Date(now.getTime() + diffClose),
    isOpen: et >= open && et < close,
    isClosed: et >= close,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: quizStatus } = useQuizStatus();
  const poll = useMemo(() => getPollTimes(), []);
  const quizUnlock = useMemo(() => getQuizUnlockTime(), []);
  const isQuizAvailable = quizUnlock.getTime() <= Date.now();

  const quizSubtitle = quizStatus?.is_complete
    ? `Score: ${quizStatus.correct_count}/${quizStatus.total_questions}`
    : quizStatus && quizStatus.answered_count > 0
    ? `${quizStatus.answered_count}/5 complete`
    : isQuizAvailable
    ? '5 questions ready'
    : '';

  const quizCta = quizStatus?.is_complete
    ? 'Review'
    : quizStatus && quizStatus.answered_count > 0
    ? 'Continue'
    : isQuizAvailable
    ? 'Start'
    : undefined;

  const pollSubtitle = poll.isClosed
    ? 'Poll closed — see results'
    : poll.isOpen
    ? 'Live now — answer to see results'
    : 'Opens at 8:00 PM ET';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={Assets.branding.appLogo} style={styles.headerLogo} />
            <View>
              <Text variant="titleLarge" style={styles.appName}>
                Pulse Rank
              </Text>
              {profile && <TierPill tier={profile.tier} />}
            </View>
          </View>
        </View>

        <View style={styles.cards}>
          {!isQuizAvailable && (
            <CountdownChip targetDate={quizUnlock} label="Quiz unlocks in" />
          )}

          <StatusCard
            title="Daily Quiz"
            subtitle={quizSubtitle}
            icon="head-question"
            iconColor={colors.primary}
            ctaLabel={quizCta}
            onPress={() => router.push('/quiz')}
            badge={isQuizAvailable && !quizStatus?.is_complete ? 'NEW' : undefined}
          />

          <StatusCard
            title="Live Poll"
            subtitle={pollSubtitle}
            icon="chart-bar"
            iconColor={poll.isOpen ? colors.incorrect : colors.textMuted}
            ctaLabel={poll.isOpen ? 'Vote' : undefined}
            onPress={() => router.push('/(tabs)/poll')}
            badge={poll.isOpen ? 'LIVE' : undefined}
          />
        </View>

        {profile && (
          <View style={styles.streakSection}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Your Streaks
            </Text>
            <View style={styles.streakRow}>
              <StatTile
                icon="fire"
                label="Quiz"
                value={profile.quiz_streak}
                color={colors.gold}
              />
              <StatTile
                icon="chart-timeline-variant"
                label="Poll"
                value={profile.poll_streak}
                color={colors.primary}
              />
              <StatTile
                icon="target"
                label="Accuracy"
                value={profile.accuracy_streak}
                color={colors.correct}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, gap: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerLogo: { width: 40, height: 40, borderRadius: radius.sm },
  appName: { color: colors.text, fontWeight: '700' },
  cards: { gap: spacing.lg },
  streakSection: { gap: spacing.md },
  sectionTitle: {
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  streakRow: { flexDirection: 'row', gap: spacing.sm },
});
