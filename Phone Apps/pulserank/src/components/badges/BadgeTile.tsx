import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/theme';
import type { Badge } from '@/types';

interface BadgeTileProps {
  badge: Badge;
  isEarned: boolean;
  earnCount?: number;
  onPress?: () => void;
}

export function BadgeTile({
  badge,
  isEarned,
  earnCount = 0,
  onPress,
}: BadgeTileProps) {
  const categoryColor =
    badge.category === 'accuracy_streak'
      ? colors.gold
      : badge.category === 'poll_participation'
      ? colors.primary
      : '#3B82F6';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.tile,
        pressed && styles.tilePressed,
        !isEarned && styles.tileLocked,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isEarned
              ? categoryColor + '20'
              : colors.surfaceVariant,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={badge.icon_name as any}
          size={32}
          color={isEarned ? categoryColor : colors.textMuted}
        />
        {!isEarned && (
          <View style={styles.lockOverlay}>
            <MaterialCommunityIcons
              name="lock"
              size={14}
              color={colors.textMuted}
            />
          </View>
        )}
      </View>

      <Text
        style={[styles.name, !isEarned && styles.nameLocked]}
        numberOfLines={2}
      >
        {badge.name}
      </Text>

      {isEarned && earnCount > 1 && (
        <View style={[styles.counter, { backgroundColor: categoryColor }]}>
          <Text style={styles.counterText}>x{earnCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    position: 'relative',
  },
  tilePressed: {
    opacity: 0.8,
  },
  tileLocked: {
    opacity: 0.5,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  nameLocked: {
    color: colors.textMuted,
  },
  counter: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    minWidth: 22,
    alignItems: 'center',
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
