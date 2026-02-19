import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Modal, Pressable } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMyBadges } from '@/hooks/useBadges';
import { BadgeTile } from '@/components/badges/BadgeTile';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { BADGE_CATALOG } from '@/constants/badges';
import type { Badge, UserBadge } from '@/types';
import { colors, spacing, radius } from '@/theme';

export default function BadgesScreen() {
  const { data: earnedBadges, isLoading } = useMyBadges();
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const earnedMap = new Map<string, UserBadge>();
  earnedBadges?.forEach((ub) => {
    earnedMap.set(ub.badge_id, ub);
  });

  const selectedEarned = selectedBadge
    ? earnedMap.get(selectedBadge.id)
    : null;

  if (isLoading) return <LoadingScreen message="Loading badges..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Badges
        </Text>
        <Text style={styles.subtitle}>
          {earnedMap.size} of {BADGE_CATALOG.length} earned
        </Text>
      </View>

      <FlatList
        data={BADGE_CATALOG}
        numColumns={3}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Badge }) => {
          const earned = earnedMap.get(item.id);
          return (
            <BadgeTile
              badge={item}
              isEarned={!!earned}
              earnCount={earned?.earn_count}
              onPress={() => setSelectedBadge(item)}
            />
          );
        }}
        contentContainerStyle={styles.grid}
      />

      <Modal
        visible={!!selectedBadge}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedBadge(null)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {selectedBadge && (
              <>
                <View
                  style={[
                    styles.modalIcon,
                    {
                      backgroundColor: selectedEarned
                        ? colors.gold + '20'
                        : colors.surfaceVariant,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={selectedBadge.icon_name as any}
                    size={56}
                    color={selectedEarned ? colors.gold : colors.textMuted}
                  />
                </View>

                <Text variant="titleLarge" style={styles.modalTitle}>
                  {selectedBadge.name}
                </Text>
                <Text style={styles.modalDesc}>
                  {selectedBadge.description}
                </Text>

                {selectedEarned && (
                  <View style={styles.modalEarned}>
                    <MaterialCommunityIcons
                      name="check-decagram"
                      size={16}
                      color={colors.correct}
                    />
                    <Text style={styles.modalEarnedText}>
                      Earned{' '}
                      {selectedEarned.earn_count > 1
                        ? `${selectedEarned.earn_count} times`
                        : 'once'}
                    </Text>
                  </View>
                )}

                {!selectedEarned && (
                  <View style={styles.modalLocked}>
                    <MaterialCommunityIcons
                      name="lock"
                      size={16}
                      color={colors.textMuted}
                    />
                    <Text style={styles.modalLockedText}>Not yet earned</Text>
                  </View>
                )}

                <Button
                  mode="outlined"
                  onPress={() => setSelectedBadge(null)}
                  textColor={colors.textSecondary}
                  style={styles.modalClose}
                >
                  Close
                </Button>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: spacing.xl,
    gap: spacing.xs,
  },
  title: { color: colors.text, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: 14 },
  grid: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.lg,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { color: colors.text, fontWeight: '700', textAlign: 'center' },
  modalDesc: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalEarned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.correctBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  modalEarnedText: { color: colors.correct, fontSize: 13, fontWeight: '600' },
  modalLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  modalLockedText: { color: colors.textMuted, fontSize: 13 },
  modalClose: { borderColor: colors.border, width: '100%', marginTop: spacing.sm },
});
