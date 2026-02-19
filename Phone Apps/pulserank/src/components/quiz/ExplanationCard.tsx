import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/theme';

interface ExplanationCardProps {
  isCorrect: boolean;
  explanation: string;
  wrongExplanation?: string;
}

export function ExplanationCard({
  isCorrect,
  explanation,
  wrongExplanation,
}: ExplanationCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name={isCorrect ? 'check-decagram' : 'information'}
          size={20}
          color={isCorrect ? colors.correct : colors.primary}
        />
        <Text
          style={[
            styles.headerText,
            { color: isCorrect ? colors.correct : colors.primary },
          ]}
        >
          {isCorrect ? 'Correct — nice read.' : "Close — here's the key detail."}
        </Text>
      </View>

      <Text style={styles.explanation}>{explanation}</Text>

      {!isCorrect && wrongExplanation && (
        <View style={styles.wrongSection}>
          <Text style={styles.wrongLabel}>Why your answer is wrong:</Text>
          <Text style={styles.wrongText}>{wrongExplanation}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  explanation: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
  },
  wrongSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  wrongLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wrongText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
