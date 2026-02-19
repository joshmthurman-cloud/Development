import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/theme';

interface PollQuestionProps {
  questionText: string;
  choices: string[];
  selectedIndex: number | null;
  isRevealed: boolean;
  correctIndex: number;
  onSelect: (index: number) => void;
}

export function PollQuestion({
  questionText,
  choices,
  selectedIndex,
  isRevealed,
  correctIndex,
  onSelect,
}: PollQuestionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.liveTag}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE POLL</Text>
      </View>

      <Text variant="headlineSmall" style={styles.question}>
        {questionText}
      </Text>

      <View style={styles.choices}>
        {choices.map((choice, i) => {
          const isSelected = selectedIndex === i;
          const isCorrect = isRevealed && i === correctIndex;
          const isWrong = isRevealed && isSelected && i !== correctIndex;

          return (
            <Pressable
              key={i}
              style={[
                styles.choice,
                isCorrect && styles.choiceCorrect,
                isWrong && styles.choiceWrong,
                isSelected && !isRevealed && styles.choiceSelected,
              ]}
              onPress={() => onSelect(i)}
              disabled={isRevealed}
            >
              <Text style={styles.choiceText}>{choice}</Text>
              {isCorrect && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color={colors.correct}
                />
              )}
              {isWrong && (
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color={colors.incorrect}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.incorrect + '18',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.incorrect,
  },
  liveText: {
    color: colors.incorrect,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  question: {
    color: colors.text,
    fontWeight: '600',
    lineHeight: 32,
  },
  choices: {
    gap: spacing.md,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
  },
  choiceCorrect: {
    borderColor: colors.correct,
    backgroundColor: colors.correctBg,
  },
  choiceWrong: {
    borderColor: colors.incorrect,
    backgroundColor: colors.incorrectBg,
  },
  choiceText: {
    color: colors.text,
    fontSize: 15,
    flex: 1,
    marginRight: spacing.sm,
  },
});
