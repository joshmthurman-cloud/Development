import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/theme';

interface AnswerOptionProps {
  index: number;
  text: string;
  isSelected: boolean;
  isCorrect?: boolean;
  isRevealed: boolean;
  correctIndex?: number;
  onPress: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export function AnswerOption({
  index,
  text,
  isSelected,
  isCorrect,
  isRevealed,
  correctIndex,
  onPress,
}: AnswerOptionProps) {
  const isThisCorrect = isRevealed && index === correctIndex;
  const isThisWrong = isRevealed && isSelected && !isCorrect;

  let bgColor = colors.surfaceVariant;
  let borderColor = colors.border;
  let iconName: string | null = null;
  let iconColor = colors.textSecondary;

  if (isThisCorrect) {
    bgColor = colors.correctBg;
    borderColor = colors.correct;
    iconName = 'check-circle';
    iconColor = colors.correct;
  } else if (isThisWrong) {
    bgColor = colors.incorrectBg;
    borderColor = colors.incorrect;
    iconName = 'close-circle';
    iconColor = colors.incorrect;
  } else if (isSelected && !isRevealed) {
    borderColor = colors.primary;
    bgColor = colors.primary + '12';
  }

  return (
    <Pressable
      style={[styles.option, { backgroundColor: bgColor, borderColor }]}
      onPress={onPress}
      disabled={isRevealed}
    >
      <View
        style={[
          styles.letter,
          {
            backgroundColor: isThisCorrect
              ? colors.correct + '20'
              : isThisWrong
              ? colors.incorrect + '20'
              : colors.card,
          },
        ]}
      >
        <Text
          style={[
            styles.letterText,
            {
              color: isThisCorrect
                ? colors.correct
                : isThisWrong
                ? colors.incorrect
                : colors.textSecondary,
            },
          ]}
        >
          {LETTERS[index]}
        </Text>
      </View>
      <Text style={styles.text} numberOfLines={3}>
        {text}
      </Text>
      {iconName && (
        <MaterialCommunityIcons
          name={iconName as any}
          size={22}
          color={iconColor}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: spacing.md,
  },
  letter: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  text: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
});
