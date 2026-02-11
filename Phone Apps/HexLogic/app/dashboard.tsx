import { ResourceIcon } from '@/components/ResourceIcon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Game, RollResult } from '@/core';
import { calculateVP, rollDice } from '@/core';
import { clearGame, loadGame, saveGame } from '@/utils/storage';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

export default function DashboardScreen() {
  const [game, setGame] = useState<Game | null>(null);
  const [selectedRoll, setSelectedRoll] = useState<number | null>(null);
  const [rollResult, setRollResult] = useState<RollResult | null>(null);
  const [highlightedNumber, setHighlightedNumber] = useState<number | null>(null);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
  const [endGameConfirmCount, setEndGameConfirmCount] = useState(0);
  const [showDiceRollInfo, setShowDiceRollInfo] = useState(false);

  const DICE_NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const refreshGame = useCallback(() => {
    loadGame().then((loaded) => {
      if (!loaded) {
        router.replace('/');
        return;
      }
      setGame(loaded);
    });
  }, []);

  useEffect(() => {
    refreshGame();
  }, [refreshGame]);

  useFocusEffect(
    useCallback(() => {
      refreshGame();
    }, [refreshGame])
  );

  const handleSave = async (updatedGame: Game) => {
    await saveGame(updatedGame);
    setGame(updatedGame);
  };

  const handlePlayerClick = (playerId: string) => {
    (router as { push: (href: string) => void }).push(`/player/${playerId}`);
  };

  const handleRoll = () => {
    const rollNumber = selectedRoll ?? rollResult?.total;
    if (rollNumber == null) return;
    setSelectedRoll(null);
    setHighlightedNumber(null);
    setRollResult(null);
    if (rollNumber === 7) {
      (router as { push: (o: { pathname: string; params: { roll: string } }) => void }).push({ pathname: '/move-robber', params: { roll: '7' } });
    } else {
      (router as { push: (o: { pathname: string; params: { roll: string } }) => void }).push({ pathname: '/roll-result', params: { roll: String(rollNumber) } });
    }
  };

  const handleRandomRoll = () => {
    const result = rollDice();
    setRollResult(result);
    setSelectedRoll(null);
    setHighlightedNumber(null);
    if (result.total === 7) {
      (router as { push: (o: { pathname: string; params: { roll: string } }) => void }).push({ pathname: '/move-robber', params: { roll: '7' } });
    } else {
      (router as { push: (o: { pathname: string; params: { roll: string } }) => void }).push({ pathname: '/roll-result', params: { roll: String(result.total) } });
    }
  };

  const handleNumberSelect = (value: number) => {
    setSelectedRoll(value);
    setHighlightedNumber(value);
    setRollResult(null);
  };

  const handleEndGame = () => {
    if (endGameConfirmCount === 0) {
      setEndGameConfirmCount(1);
      return;
    }
    setShowEndGameConfirm(true);
  };

  const confirmEndGame = async () => {
    await clearGame();
    setShowEndGameConfirm(false);
    setEndGameConfirmCount(0);
    router.replace('/');
  };

  if (!game) {
    return (
      <>
        <Stack.Screen options={{ title: 'Active Game', headerBackTitle: 'Home' }} />
        <ThemedView style={styles.loading}>
          <ThemedText>Loading...</ThemedText>
        </ThemedView>
      </>
    );
  }

  const winner = game.players.find(p => calculateVP(p) >= game.vpTarget);

  return (
    <>
      <Stack.Screen options={{ title: 'Active Game', headerBackTitle: 'Home' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {winner && (
          <View style={styles.winnerBanner}>
            <ThemedText style={styles.winnerText}>🎉 {winner.name} Wins! 🎉</ThemedText>
          </View>
        )}

        {game.mode === 'full' && (
          <View style={styles.playerGrid}>
            {game.players.map((player) => {
              const vp = calculateVP(player);
              return (
                <Pressable
                  key={player.id}
                  style={[styles.playerCard, { borderLeftColor: getPlayerColor(player.color) }]}
                  onPress={() => handlePlayerClick(player.id)}
                >
                  <ThemedText type="defaultSemiBold" style={styles.playerName}>{player.name}</ThemedText>
                  <ThemedText style={styles.playerVp}>Points: {vp}</ThemedText>
                  {(player.hasLongestRoad || player.knightsCount > 0 || player.hasLargestArmy || player.victoryPointCards > 0) && (
                    <View style={styles.playerBadges}>
                      {player.hasLongestRoad && <ThemedText style={styles.badge}>✓ Longest Road</ThemedText>}
                      {player.knightsCount > 0 && <ThemedText style={styles.badge}>✓ Knights: {player.knightsCount}</ThemedText>}
                      {player.hasLargestArmy && <ThemedText style={styles.badge}>✓ Largest Army</ThemedText>}
                      {player.victoryPointCards > 0 && <ThemedText style={styles.badge}>✓ VP Cards: {player.victoryPointCards}</ThemedText>}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.diceSection}>
          <View style={styles.diceLabelRow}>
            <ThemedText style={styles.diceLabel}>Enter Dice Roll (2–12)</ThemedText>
            <Pressable
              hitSlop={8}
              onPress={() => setShowDiceRollInfo(true)}
              style={styles.infoIconWrap}
            >
              <IconSymbol name="info.circle" size={18} color="#6b7280" />
            </Pressable>
          </View>
          <View style={styles.numberGrid}>
            {DICE_NUMBERS.map((n) => (
              <Pressable
                key={n}
                style={[
                  styles.numberBtn,
                  highlightedNumber === n && styles.numberBtnSelected,
                ]}
                onPress={() => handleNumberSelect(n)}
              >
                <ThemedText style={[styles.numberBtnText, highlightedNumber === n && styles.numberBtnTextSelected]}>{n}</ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={styles.rollRow}>
            <Pressable
              style={[styles.rollBtn, styles.rollBtnPrimary, selectedRoll === null && styles.rollBtnDisabled]}
              onPress={handleRoll}
              disabled={selectedRoll === null}
            >
              <ThemedText style={styles.rollBtnText}>Resolve Roll{selectedRoll != null ? ` ${selectedRoll}` : ''}</ThemedText>
            </Pressable>
            <Pressable style={[styles.rollBtn, styles.rollBtnSecondary]} onPress={handleRandomRoll}>
              <ThemedText style={styles.rollBtnTextSecondary}>Random Roll for Me!</ThemedText>
            </Pressable>
          </View>
          <Pressable
            style={styles.moveRobberBtn}
            onPress={() => (router as { push: (href: string) => void }).push('/move-robber')}
          >
            <ThemedText style={styles.moveRobberBtnText}>Move Robber</ThemedText>
          </Pressable>
        </View>

        {game.mode === 'solo' && game.soloSettings?.trackResourceHand && game.players[0] && (
          <View style={styles.resourceSection}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>My Resources</ThemedText>
            {(['Brick', 'Lumber', 'Wool', 'Grain', 'Ore'] as const).map((resource) => {
              const current = game.players[0].resourceHand?.[resource] ?? 0;
              return (
                <View key={resource} style={styles.resourceRow}>
                  <ResourceIcon resource={resource} size={32} />
                  <ThemedText style={styles.resourceName}>{resource}</ThemedText>
                  <View style={styles.stepper}>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={async () => {
                        const updated = { ...game };
                        if (!updated.players[0].resourceHand) {
                          updated.players[0].resourceHand = { Brick: 0, Lumber: 0, Wool: 0, Grain: 0, Ore: 0 };
                        }
                        updated.players[0].resourceHand![resource] = Math.max(0, current - 1);
                        await handleSave(updated);
                      }}
                    >
                      <ThemedText style={styles.stepperText}>−</ThemedText>
                    </Pressable>
                    <ThemedText style={styles.stepperValue}>{current}</ThemedText>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={async () => {
                        const updated = { ...game };
                        if (!updated.players[0].resourceHand) {
                          updated.players[0].resourceHand = { Brick: 0, Lumber: 0, Wool: 0, Grain: 0, Ore: 0 };
                        }
                        updated.players[0].resourceHand![resource] = current + 1;
                        await handleSave(updated);
                      }}
                    >
                      <ThemedText style={styles.stepperText}>+</ThemedText>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {game.mode === 'solo' && game.players[0] && (
          <Pressable style={styles.editBuildingsBtn} onPress={() => handlePlayerClick(game.players[0].id)}>
            <ThemedText style={styles.editBuildingsText}>Edit My Buildings</ThemedText>
          </Pressable>
        )}

        <Pressable
          style={[styles.endGameBtn, endGameConfirmCount === 1 && styles.endGameBtnConfirm]}
          onPress={handleEndGame}
        >
          <ThemedText style={styles.endGameText}>
            {endGameConfirmCount === 0 ? 'End Game' : 'Confirm End Game'}
          </ThemedText>
        </Pressable>

        <Modal visible={showDiceRollInfo} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setShowDiceRollInfo(false)}>
            <Pressable style={styles.popoverBox} onPress={(e) => e.stopPropagation()}>
              <ThemedText type="subtitle" style={styles.popoverTitle}>Dice Roll</ThemedText>
              <ThemedText style={styles.popoverBody}>
                If you rolled physical dice, enter the total here. HexLogic will calculate all resource payouts.
              </ThemedText>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={showEndGameConfirm} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setShowEndGameConfirm(false)}>
            <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
              <ThemedText type="subtitle" style={styles.modalTitle}>⚠️ End Game?</ThemedText>
              <ThemedText style={styles.modalBody}>
                This will permanently delete your current game. All progress will be lost.
              </ThemedText>
              <View style={styles.modalActions}>
                <Pressable style={styles.modalBtnSecondary} onPress={() => setShowEndGameConfirm(false)}>
                  <ThemedText style={styles.modalBtnTextSecondary}>Cancel</ThemedText>
                </Pressable>
                <Pressable style={styles.modalBtnDanger} onPress={confirmEndGame}>
                  <ThemedText style={styles.modalBtnTextDanger}>End Game</ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </>
  );
}

function getPlayerColor(color: string): string {
  const map: Record<string, string> = {
    Red: '#dc2626', Blue: '#2563eb', White: '#f5f5f5', Orange: '#ea580c', Green: '#16a34a', Brown: '#78350f',
  };
  return map[color] ?? '#9ca3af';
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  winnerBanner: { backgroundColor: '#fef3c7', padding: 16, borderRadius: 12, marginBottom: 20 },
  winnerText: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  playerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  playerCard: {
    minWidth: 140,
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: { fontSize: 16, marginBottom: 4, textAlign: 'center' },
  playerVp: { fontSize: 14, marginBottom: 4, textAlign: 'center' },
  playerBadges: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  badge: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  diceSection: { marginBottom: 24 },
  diceLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  diceLabel: { fontSize: 16, flex: 1 },
  infoIconWrap: { padding: 4 },
  numberGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  numberBtn: {
    padding: 12,
    minWidth: 48,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBtnSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  numberBtnText: { fontSize: 16 },
  numberBtnTextSelected: { color: '#2563eb', fontWeight: '600' },
  rollRow: { flexDirection: 'row', gap: 12 },
  rollBtn: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rollBtnPrimary: { backgroundColor: '#2563eb' },
  rollBtnSecondary: { backgroundColor: '#e5e7eb' },
  rollBtnDisabled: { opacity: 0.5 },
  rollBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  rollBtnTextSecondary: { color: '#374151', fontSize: 16, textAlign: 'center' },
  moveRobberBtn: {
    marginTop: 12,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#78716c',
    alignItems: 'center',
  },
  moveRobberBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resourceSection: { backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionTitle: { marginBottom: 12, fontSize: 18 },
  resourceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', gap: 12 },
  resourceName: { flex: 1, fontSize: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  stepperText: { fontSize: 18, fontWeight: '600' },
  stepperValue: { minWidth: 24, textAlign: 'center', fontSize: 16 },
  editBuildingsBtn: { backgroundColor: '#e5e7eb', padding: 16, borderRadius: 8, marginBottom: 24 },
  editBuildingsText: { textAlign: 'center', fontSize: 16 },
  endGameBtn: { backgroundColor: '#dc2626', padding: 16, borderRadius: 8 },
  endGameBtnConfirm: { backgroundColor: '#b91c1c' },
  endGameText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { marginBottom: 12, fontSize: 20 },
  modalBody: { marginBottom: 20, fontSize: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtnSecondary: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
  modalBtnDanger: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#dc2626', alignItems: 'center' },
  modalBtnTextSecondary: { fontSize: 16 },
  modalBtnTextDanger: { color: '#fff', fontSize: 16, fontWeight: '600' },
  popoverBox: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginHorizontal: 24, maxWidth: 320 },
  popoverTitle: { marginBottom: 8, fontSize: 17, fontWeight: '600' },
  popoverBody: { fontSize: 15, lineHeight: 22, color: '#374151' },
});
