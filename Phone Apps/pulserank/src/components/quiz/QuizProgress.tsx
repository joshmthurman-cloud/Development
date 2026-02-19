import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '@/theme';

interface QuizProgressProps {
  total: number;
  current: number;
  answered: number;
}

export function QuizProgress({ total, current, answered }: QuizProgressProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            i < answered
              ? styles.segmentDone
              : i === current
              ? styles.segmentActive
              : styles.segmentPending,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: radius.full,
  },
  segmentDone: {
    backgroundColor: colors.primary,
  },
  segmentActive: {
    backgroundColor: colors.primaryLight,
  },
  segmentPending: {
    backgroundColor: colors.border,
  },
});
