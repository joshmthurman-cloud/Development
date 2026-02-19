import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TIER_LIST } from '@/constants/tiers';
import type { KnowledgeLevel } from '@/types';
import { colors, spacing, radius } from '@/theme';

interface TierSelectorProps {
  selected: KnowledgeLevel | null;
  onSelect: (tier: KnowledgeLevel) => void;
}

export function TierSelector({ selected, onSelect }: TierSelectorProps) {
  return (
    <View style={styles.container}>
      {TIER_LIST.map((tier) => {
        const isSelected = selected === tier.key;
        return (
          <Pressable
            key={tier.key}
            style={[
              styles.card,
              isSelected && {
                borderColor: tier.color,
                backgroundColor: tier.color + '10',
              },
            ]}
            onPress={() => onSelect(tier.key)}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: tier.color + '18' },
              ]}
            >
              <MaterialCommunityIcons
                name={tier.icon as any}
                size={24}
                color={tier.color}
              />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{tier.label}</Text>
              <Text style={styles.desc} numberOfLines={2}>
                {tier.description}
              </Text>
            </View>
            {isSelected && (
              <MaterialCommunityIcons
                name="check-circle"
                size={22}
                color={tier.color}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  desc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
