import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/theme';
import type { LeaderboardEntry } from '@/types';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isMe: boolean;
  onPress?: () => void;
}

function getRankIcon(rank: number) {
  if (rank === 1)
    return { name: 'trophy', color: colors.gold } as const;
  if (rank === 2)
    return { name: 'trophy-outline', color: colors.silver } as const;
  if (rank === 3)
    return { name: 'trophy-outline', color: colors.bronze } as const;
  return null;
}

export function LeaderboardRow({ entry, isMe, onPress }: LeaderboardRowProps) {
  const rankIcon = getRankIcon(entry.rank);

  return (
    <Pressable
      style={[styles.row, isMe && styles.rowMe]}
      onPress={onPress}
    >
      <View style={styles.rankWrap}>
        {rankIcon ? (
          <MaterialCommunityIcons
            name={rankIcon.name as any}
            size={22}
            color={rankIcon.color}
          />
        ) : (
          <Text style={styles.rank}>{entry.rank}</Text>
        )}
      </View>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(entry.username ?? '?')[0].toUpperCase()}
        </Text>
      </View>

      <View style={styles.info}>
        <Text style={[styles.username, isMe && styles.usernameMe]}>
          {entry.username ?? 'Unknown'}
          {isMe && ' (You)'}
        </Text>
      </View>

      <Text style={styles.score}>{Math.round(entry.score)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  rowMe: {
    backgroundColor: colors.primary + '0D',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  rankWrap: {
    width: 32,
    alignItems: 'center',
  },
  rank: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  info: {
    flex: 1,
  },
  username: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  usernameMe: {
    color: colors.primary,
    fontWeight: '600',
  },
  score: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
