import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useTodayPoll,
  usePollStats,
  useMyPollAnswer,
  useSubmitPollAnswer,
} from '@/hooks/usePoll';
import { PollQuestion } from '@/components/poll/PollQuestion';
import { LiveStatsBar } from '@/components/poll/LiveStatsBar';
import { CountdownChip } from '@/components/common/CountdownChip';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { EmptyState } from '@/components/common/EmptyState';
import { colors, spacing } from '@/theme';

function getPollWindow() {
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
    isBefore: et < open,
    isAfter: et >= close,
  };
}

export default function PollScreen() {
  const { data: poll, isLoading } = useTodayPoll();
  const { data: stats } = usePollStats(poll?.id);
  const { data: myAnswer } = useMyPollAnswer(poll?.id);
  const submitPoll = useSubmitPollAnswer();
  const window = useMemo(() => getPollWindow(), []);
  const [localSelected, setLocalSelected] = useState<number | null>(null);

  const hasAnswered = !!myAnswer || localSelected !== null;
  const selectedIndex = myAnswer?.selected_index ?? localSelected;

  const handleSelect = useCallback(
    async (index: number) => {
      if (hasAnswered || !poll?.question) return;
      setLocalSelected(index);

      submitPoll.mutate({
        pollQuestionId: poll.id,
        selectedIndex: index,
        correctIndex: poll.question.correct_index,
      });
    },
    [hasAnswered, poll]
  );

  if (isLoading) return <LoadingScreen message="Loading poll..." />;

  if (!poll?.question) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <EmptyState
          icon="chart-bar"
          title="No Poll Today"
          message="Check back at 8:00 PM ET for tonight's live poll question."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Live Poll
          </Text>
          {window.isOpen && (
            <CountdownChip targetDate={window.closesAt} label="Closes in" />
          )}
          {window.isBefore && (
            <CountdownChip targetDate={window.opensAt} label="Opens in" />
          )}
          {window.isAfter && (
            <Text style={styles.closedText}>Poll closed for today</Text>
          )}
        </View>

        <PollQuestion
          questionText={poll.question.question_text}
          choices={poll.question.choices}
          selectedIndex={selectedIndex}
          isRevealed={hasAnswered}
          correctIndex={poll.question.correct_index}
          onSelect={handleSelect}
        />

        {hasAnswered && stats && <LiveStatsBar stats={stats} />}

        {!hasAnswered && !window.isOpen && (
          <View style={styles.lockedMessage}>
            <Text style={styles.lockedText}>
              {window.isBefore
                ? 'Voting opens at 8:00 PM ET tonight.'
                : 'This poll has closed. Come back tomorrow at 8:00 PM ET.'}
            </Text>
          </View>
        )}

        {hasAnswered && (
          <Text style={styles.comeBack}>
            Come back tomorrow at 8:00 PM ET for the next poll.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, gap: spacing.xxl },
  header: { gap: spacing.sm },
  title: { color: colors.text, fontWeight: '700' },
  closedText: { color: colors.textMuted, fontSize: 13 },
  lockedMessage: {
    backgroundColor: colors.surfaceVariant,
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  lockedText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  comeBack: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
