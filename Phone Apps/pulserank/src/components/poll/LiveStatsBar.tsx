import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { colors, spacing, radius } from '@/theme';
import type { PollStats } from '@/types';

interface LiveStatsBarProps {
  stats: PollStats;
}

export function LiveStatsBar({ stats }: LiveStatsBarProps) {
  const correctPct = stats.correct_percentage;
  const incorrectPct = 100 - correctPct;

  const correctBarStyle = useAnimatedStyle(() => ({
    flex: withTiming(Math.max(correctPct, 2), { duration: 600 }),
  }));

  const incorrectBarStyle = useAnimatedStyle(() => ({
    flex: withTiming(Math.max(incorrectPct, 2), { duration: 600 }),
  }));

  return (
    <View style={styles.container}>
      <Text variant="titleSmall" style={styles.title}>
        Live Results
      </Text>
      <Text style={styles.total}>
        {stats.total_answers} {stats.total_answers === 1 ? 'answer' : 'answers'}
      </Text>

      <View style={styles.barSection}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.correct }]}>
            Correct
          </Text>
          <Text style={[styles.pct, { color: colors.correct }]}>
            {correctPct}%
          </Text>
        </View>
        <View style={styles.barTrack}>
          <Animated.View
            style={[styles.barFill, styles.barCorrect, correctBarStyle]}
          />
        </View>
      </View>

      <View style={styles.barSection}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.incorrect }]}>
            Incorrect
          </Text>
          <Text style={[styles.pct, { color: colors.incorrect }]}>
            {incorrectPct}%
          </Text>
        </View>
        <View style={styles.barTrack}>
          <Animated.View
            style={[styles.barFill, styles.barIncorrect, incorrectBarStyle]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontWeight: '600',
  },
  total: {
    color: colors.textMuted,
    fontSize: 12,
  },
  barSection: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  pct: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    height: 10,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.full,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  barFill: {
    height: '100%',
  },
  barCorrect: {
    backgroundColor: colors.correct,
  },
  barIncorrect: {
    backgroundColor: colors.incorrect,
  },
});
