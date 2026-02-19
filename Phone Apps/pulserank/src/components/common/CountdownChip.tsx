import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/theme';

interface CountdownChipProps {
  targetDate: Date;
  label?: string;
  onExpire?: () => void;
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function CountdownChip({ targetDate, label, onExpire }: CountdownChipProps) {
  const [timeLeft, setTimeLeft] = useState(
    targetDate.getTime() - Date.now()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = targetDate.getTime() - Date.now();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  const expired = timeLeft <= 0;

  return (
    <View style={styles.chip}>
      <MaterialCommunityIcons
        name={expired ? 'check-circle' : 'clock-outline'}
        size={14}
        color={expired ? colors.correct : colors.textSecondary}
      />
      <Text style={[styles.text, expired && styles.textExpired]}>
        {label && `${label} `}
        {expired ? 'Available now' : formatTimeLeft(timeLeft)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  textExpired: {
    color: colors.correct,
  },
});
