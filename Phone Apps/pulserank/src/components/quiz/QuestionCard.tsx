import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing, radius } from '@/theme';

interface QuestionCardProps {
  questionNumber: number;
  totalQuestions: number;
  topic: string;
  questionText: string;
}

export function QuestionCard({
  questionNumber,
  totalQuestions,
  topic,
  questionText,
}: QuestionCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.meta}>
        <View style={styles.topicChip}>
          <Text style={styles.topicText}>{topic}</Text>
        </View>
        <Text style={styles.progress}>
          {questionNumber} of {totalQuestions}
        </Text>
      </View>
      <Text variant="headlineSmall" style={styles.question}>
        {questionText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicChip: {
    backgroundColor: colors.primary + '18',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  topicText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  progress: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  question: {
    color: colors.text,
    fontWeight: '600',
    lineHeight: 32,
  },
});
