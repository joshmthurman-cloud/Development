import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TIERS } from '@/constants/tiers';
import type { KnowledgeLevel } from '@/types';
import { spacing, radius } from '@/theme';

interface TierPillProps {
  tier: KnowledgeLevel;
  size?: 'small' | 'medium';
}

export function TierPill({ tier, size = 'small' }: TierPillProps) {
  const info = TIERS[tier];
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: info.color + '20', borderColor: info.color + '40' },
        isSmall ? styles.pillSmall : styles.pillMedium,
      ]}
    >
      <MaterialCommunityIcons
        name={info.icon as any}
        size={isSmall ? 12 : 16}
        color={info.color}
      />
      <Text
        style={[
          styles.label,
          { color: info.color },
          isSmall ? styles.labelSmall : styles.labelMedium,
        ]}
      >
        {info.shortLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pillSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 4,
  },
  pillMedium: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: 6,
  },
  label: {
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 11,
  },
  labelMedium: {
    fontSize: 13,
  },
});
