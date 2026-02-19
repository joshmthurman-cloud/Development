import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useLeaderboard, useMyRank } from '@/hooks/useLeaderboard';
import { LeaderboardRow } from '@/components/leaderboard/LeaderboardRow';
import { TierPill } from '@/components/common/TierPill';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { EmptyState } from '@/components/common/EmptyState';
import { TIER_LIST } from '@/constants/tiers';
import type { KnowledgeLevel, LeaderboardEntry } from '@/types';
import { colors, spacing, radius } from '@/theme';

export default function LeaderboardScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');
  const [selectedTier, setSelectedTier] = useState<KnowledgeLevel>(
    profile?.tier ?? 'layperson'
  );

  const { data: entries, isLoading } = useLeaderboard(selectedTier, period);
  const { data: myRank } = useMyRank(selectedTier, period);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Leaderboard
        </Text>

        <View style={styles.tierScroll}>
          {TIER_LIST.map((tier) => (
            <View key={tier.key}>
              <TierPill tier={tier.key} size={selectedTier === tier.key ? 'medium' : 'small'} />
              <View
                style={[
                  styles.tierTap,
                  selectedTier === tier.key && styles.tierTapActive,
                ]}
                onTouchEnd={() => setSelectedTier(tier.key)}
              />
            </View>
          ))}
        </View>

        <SegmentedButtons
          value={period}
          onValueChange={(v) => setPeriod(v as '7d' | '30d')}
          buttons={[
            { value: '7d', label: '7 Days' },
            { value: '30d', label: '30 Days' },
          ]}
          style={styles.segmented}
          theme={{
            colors: {
              secondaryContainer: colors.primary + '20',
              onSecondaryContainer: colors.primary,
              outline: colors.border,
            },
          }}
        />
      </View>

      {myRank && (
        <View style={styles.myRankBanner}>
          <Text style={styles.myRankLabel}>Your Rank</Text>
          <Text style={styles.myRankValue}>#{myRank.rank}</Text>
          <Text style={styles.myRankScore}>
            {Math.round(myRank.score)} pts
          </Text>
        </View>
      )}

      {isLoading ? (
        <LoadingScreen />
      ) : !entries || entries.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title="No Rankings Yet"
          message="Complete your daily quizzes to appear on the leaderboard."
        />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item }: { item: LeaderboardEntry }) => (
            <LeaderboardRow
              entry={item}
              isMe={item.user_id === profile?.id}
              onPress={() => {
                if (item.username && item.user_id !== profile?.id) {
                  router.push(`/social/${item.username}`);
                }
              }}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: spacing.xl,
    gap: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontWeight: '700' },
  tierScroll: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  tierTap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  tierTapActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  segmented: {},
  myRankBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '30',
  },
  myRankLabel: { color: colors.textSecondary, fontSize: 13 },
  myRankValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  myRankScore: {
    color: colors.textMuted,
    fontSize: 13,
    marginLeft: 'auto',
  },
  list: { paddingBottom: spacing.xxxl },
});
