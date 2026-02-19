import React from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useMyBadges } from '@/hooks/useBadges';
import { TierPill } from '@/components/common/TierPill';
import { StatTile } from '@/components/common/StatTile';
import { BadgeTile } from '@/components/badges/BadgeTile';
import { BADGE_CATALOG } from '@/constants/badges';
import { colors, spacing, radius } from '@/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: earnedBadges } = useMyBadges();

  const earnedMap = new Map(
    earnedBadges?.map((ub) => [ub.badge_id, ub]) ?? []
  );

  const topBadges = BADGE_CATALOG.filter((b) => earnedMap.has(b.id)).slice(
    0,
    6
  );

  if (!profile) return null;

  const initial = profile.username[0]?.toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }} />
          <IconButton
            icon="cog"
            iconColor={colors.textSecondary}
            onPress={() => router.push('/settings')}
          />
        </View>

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text variant="headlineSmall" style={styles.username}>
            {profile.username}
          </Text>
          <TierPill tier={profile.tier} size="medium" />
          <Text style={styles.memberSince}>
            Member since{' '}
            {new Date(profile.created_at).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <StatTile
            icon="fire"
            label="Quiz Streak"
            value={profile.quiz_streak}
            color={colors.gold}
          />
          <StatTile
            icon="chart-timeline-variant"
            label="Poll Streak"
            value={profile.poll_streak}
            color={colors.primary}
          />
          <StatTile
            icon="target"
            label="Best Accuracy"
            value={profile.best_accuracy_streak}
            color={colors.correct}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Earned Badges</Text>
            <Button
              mode="text"
              compact
              textColor={colors.primary}
              onPress={() => router.push('/(tabs)/badges')}
            >
              See All
            </Button>
          </View>

          {topBadges.length > 0 ? (
            <View style={styles.badgeRow}>
              {topBadges.map((badge) => (
                <BadgeTile
                  key={badge.id}
                  badge={badge}
                  isEarned
                  earnCount={earnedMap.get(badge.id)?.earn_count}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.noBadges}>
              No badges yet. Complete quizzes and polls to earn your first!
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social</Text>
          <View style={styles.socialButtons}>
            <Button
              mode="outlined"
              icon="account-search"
              onPress={() => router.push('/social/search')}
              textColor={colors.text}
              style={styles.socialButton}
            >
              Find Friends
            </Button>
            <Button
              mode="outlined"
              icon="account-group"
              onPress={() => router.push('/social')}
              textColor={colors.text}
              style={styles.socialButton}
            >
              My Friends
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, gap: spacing.xxl },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  profileHeader: { alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '700',
  },
  username: { color: colors.text, fontWeight: '700' },
  memberSince: { color: colors.textMuted, fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  section: { gap: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  noBadges: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  socialButtons: { flexDirection: 'row', gap: spacing.md },
  socialButton: {
    flex: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
});
