import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/theme';

interface StatusCardProps {
  title: string;
  subtitle: string;
  icon: string;
  iconColor?: string;
  ctaLabel?: string;
  onPress?: () => void;
  badge?: string;
}

export function StatusCard({
  title,
  subtitle,
  icon,
  iconColor = colors.primary,
  ctaLabel,
  onPress,
  badge,
}: StatusCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: iconColor + '18' }]}>
          <MaterialCommunityIcons
            name={icon as any}
            size={28}
            color={iconColor}
          />
        </View>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text variant="titleMedium" style={styles.title}>
              {title}
            </Text>
            {badge && (
              <View style={[styles.badge, { backgroundColor: iconColor }]}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}
          </View>
          <Text variant="bodySmall" style={styles.subtitle}>
            {subtitle}
          </Text>
        </View>
        {ctaLabel && (
          <View style={styles.ctaWrap}>
            <View style={[styles.cta, { backgroundColor: iconColor }]}>
              <Text style={styles.ctaText}>{ctaLabel}</Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  ctaWrap: {
    marginLeft: spacing.sm,
  },
  cta: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
