import { ResourceIcon } from '@/components/ResourceIcon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Game, ResourceCounts } from '@/core';
import { calculatePayouts } from '@/core';
import { loadGame, saveGame } from '@/utils/storage';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export default function RollResultScreen() {
  const { roll } = useLocalSearchParams<{ roll: string }>();
  const rollNumber = roll != null ? parseInt(roll, 10) : undefined;
  const [game, setGame] = useState<Game | null>(null);
  const [payouts, setPayouts] = useState<ReturnType<typeof calculatePayouts>>([]);

  useEffect(() => {
    let mounted = true;
    loadGame().then((loaded) => {
      if (!mounted || !loaded) {
        if (mounted && !loaded) router.replace('/dashboard');
        return;
      }
      setGame(loaded);
      if (rollNumber === undefined) {
        if (mounted) router.replace('/dashboard');
        return;
      }
      if (rollNumber === 7) setPayouts([]);
      else setPayouts(calculatePayouts(loaded, rollNumber));
    });
    return () => { mounted = false; };
  }, [rollNumber]);

  const handleMoveRobber = () => (router as { push: (o: { pathname: string; params: { roll: string } }) => void }).push({ pathname: '/move-robber', params: { roll: String(rollNumber) } });

  const handleApplyToMyResources = async () => {
    if (!game || !game.soloSettings?.trackResourceHand || !game.players[0]) return;
    const myPayout = payouts.find(p => p.playerId === game.players[0].id);
    if (!myPayout) return;
    const updated = { ...game };
    const player = updated.players[0];
    if (!player.resourceHand) {
      player.resourceHand = { Brick: 0, Lumber: 0, Wool: 0, Grain: 0, Ore: 0 };
    }
    Object.entries(myPayout.resources).forEach(([resource, amount]) => {
      if (amount) player.resourceHand![resource as keyof ResourceCounts] += amount;
    });
    await saveGame(updated);
    setGame(updated);
  };

  if (!game || rollNumber === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: 'Roll Result', headerBackTitle: 'Game' }} />
        <ThemedView style={styles.loading}><ThemedText>Loading...</ThemedText></ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Roll Result', headerBackTitle: 'Game' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.resultCard}>
          <ThemedText type="defaultSemiBold" style={styles.resultText}>
            {rollNumber === 7 ? '7' : `Rolled: ${rollNumber}`}
          </ThemedText>
        </View>

        {rollNumber === 7 ? (
          <View style={styles.card}>
            <ThemedText style={styles.cardBody}>7 rolled — move robber.</ThemedText>
            <Pressable style={styles.primaryBtn} onPress={handleMoveRobber}>
              <ThemedText style={styles.primaryBtnText}>Move Robber Now</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            {payouts.length === 0 ? (
              <View style={styles.card}>
                <ThemedText style={styles.cardBody}>No payouts for this roll.</ThemedText>
              </View>
            ) : (
              <View style={styles.payoutList}>
                {payouts.map((payout) => {
                  const hasBlocked = payout.blockedResources && Object.values(payout.blockedResources).some(v => v && v > 0);
                  const hasPayout = Object.values(payout.resources).some(v => v && v > 0);
                  if (!hasPayout && !hasBlocked) return null;
                  return (
                    <View key={payout.playerId} style={styles.payoutItem}>
                      <ThemedText type="defaultSemiBold" style={styles.payoutPlayer}>{payout.playerName}:</ThemedText>
                      {hasPayout && (
                        <View style={styles.payoutResources}>
                          <ThemedText style={styles.payoutLabel}>Receives:</ThemedText>
                          <View style={styles.resourceRow}>
                            {Object.entries(payout.resources).map(([resource, amount]) =>
                              amount ? (
                                <ResourceIcon key={resource} resource={resource as keyof ResourceCounts} amount={amount} size={40} />
                              ) : null
                            )}
                          </View>
                        </View>
                      )}
                      {hasBlocked && payout.blockedResources && (
                        <View style={styles.payoutResources}>
                          <ThemedText style={styles.blockedLabel}>Blocked by Robber:</ThemedText>
                          <View style={styles.resourceRow}>
                            {Object.entries(payout.blockedResources).map(([resource, amount]) =>
                              amount ? (
                                <ResourceIcon key={resource} resource={resource as keyof ResourceCounts} amount={amount} size={40} blocked />
                              ) : null
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {game.mode === 'solo' &&
              game.soloSettings?.trackResourceHand &&
              game.soloSettings?.trackBuildings &&
              payouts.some(p => p.playerId === game.players[0]?.id) && (
                <Pressable style={styles.primaryBtn} onPress={handleApplyToMyResources}>
                  <ThemedText style={styles.primaryBtnText}>Apply to My Resources</ThemedText>
                </Pressable>
              )}
          </>
        )}

        <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
          <ThemedText style={styles.secondaryBtnText}>OK</ThemedText>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  resultCard: { backgroundColor: '#f0f9ff', padding: 24, borderRadius: 12, marginBottom: 20 },
  resultText: { fontSize: 24, textAlign: 'center' },
  card: { backgroundColor: '#f9fafb', padding: 20, borderRadius: 12, marginBottom: 20 },
  cardBody: { textAlign: 'center', marginBottom: 16, fontSize: 16 },
  primaryBtn: { backgroundColor: '#2563eb', padding: 18, borderRadius: 8, marginBottom: 16 },
  primaryBtnText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '600' },
  payoutList: { marginBottom: 20 },
  payoutItem: { backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, marginBottom: 12 },
  payoutPlayer: { marginBottom: 8, fontSize: 16 },
  payoutLabel: { fontSize: 14, opacity: 0.8, marginBottom: 4 },
  blockedLabel: { fontSize: 14, color: '#dc2626', fontWeight: '600', marginBottom: 4 },
  payoutResources: { marginBottom: 8 },
  resourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondaryBtn: { padding: 18, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
  secondaryBtnText: { fontSize: 16 },
});
