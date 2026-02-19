import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { usePublicProfile, useSendFriendRequest } from '@/hooks/useSocial';
import { useUserBadges } from '@/hooks/useBadges';
import { TierPill } from '@/components/common/TierPill';
import { StatTile } from '@/components/common/StatTile';
import { BadgeTile } from '@/components/badges/BadgeTile';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { EmptyState } from '@/components/common/EmptyState';
import { BADGE_CATALOG } from '@/constants/badges';
import { colors, spacing, radius } from '@/theme';

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { data: profile, isLoading } = usePublicProfile(username);
  const { data: badges } = useUserBadges(profile?.id);
  const sendRequest = useSendFriendRequest();

  const earnedMap = new Map(badges?.map((ub) => [ub.badge_id, ub]) ?? []);

  if (isLoading) return <LoadingScreen />;
  if (!profile) {
    return (
      <>
        <Stack.Screen options={{ title: 'Profile' }} />
        <EmptyState
          icon="account-off"
          title="User Not Found"
          message={`No user with username "${username}" was found.`}
        />
      </>
    );
  }

  const initial = profile.username[0]?.toUpperCase() ?? '?';

  return (
    <>
      <Stack.Screen options={{ title: profile.username }} />
      <SafeAreaView style={styles.safe} edges={[]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <Text variant="headlineSmall" style={styles.username}>
              {profile.username}
            </Text>
            <TierPill tier={profile.tier} size="medium" />

            <Button
              mode="contained"
              icon="account-plus"
              onPress={() => sendRequest.mutate(profile.id)}
              buttonColor={colors.primary}
              textColor="#FFFFFF"
              style={styles.followButton}
            >
              Add Friend
            </Button>
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

          <View style={styles.badgeSection}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <View style={styles.badgeGrid}>
              {BADGE_CATALOG.map((badge) => (
                <BadgeTile
                  key={badge.id}
                  badge={badge}
                  isEarned={earnedMap.has(badge.id)}
                  earnCount={earnedMap.get(badge.id)?.earn_count}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, gap: spacing.xxl },
  profileHeader: { alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontSize: 32, fontWeight: '700' },
  username: { color: colors.text, fontWeight: '700' },
  followButton: { borderRadius: radius.md, marginTop: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  badgeSection: { gap: spacing.md },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap' },
});
