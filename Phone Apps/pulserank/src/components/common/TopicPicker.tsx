import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TOPICS } from '@/constants/topics';
import { colors, spacing, radius } from '@/theme';

interface TopicPickerProps {
  selected: string[];
  onToggle: (topicKey: string) => void;
  label?: string;
}

export function TopicPicker({ selected, onToggle, label }: TopicPickerProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.grid}>
        {TOPICS.map((topic) => {
          const isActive = selected.includes(topic.key);
          return (
            <Pressable
              key={topic.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onToggle(topic.key)}
            >
              <MaterialCommunityIcons
                name={topic.icon as any}
                size={16}
                color={isActive ? colors.primary : colors.textMuted}
              />
              <Text
                style={[styles.chipText, isActive && styles.chipTextActive]}
              >
                {topic.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary + '60',
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.primary,
  },
});
