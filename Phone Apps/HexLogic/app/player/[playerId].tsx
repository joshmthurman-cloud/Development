import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Modal, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Stack, router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadGame, saveGame } from '@/utils/storage';
import type { Game, Player } from '@/core';
import { calculateVP, validateLargestArmy } from '@/core';
import { ResourceIcon } from '@/components/ResourceIcon';

export default function PlayerDetailScreen() {
  const insets = useSafeAreaInsets();
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const refreshGame = useCallback(() => {
    if (!playerId) return;
    loadGame().then((loaded) => {
      if (!loaded || !playerId) {
        if (loaded && !playerId) router.replace('/dashboard');
        return;
      }
      setGame(loaded);
      const found = loaded.players.find(p => p.id === playerId);
      if (!found) router.replace('/dashboard');
      else setPlayer(found);
    });
  }, [playerId]);

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
    const updated = updatedGame.players.find(p => p.id === playerId);
    if (updated) setPlayer(updated);
  };

  const handleToggleLongestRoad = () => {
    if (!game || !player) return;
    const updated = { ...game };
    updated.players.forEach(p => { if (p.id !== player.id) p.hasLongestRoad = false; });
    const current = updated.players.find(p => p.id === player.id)!;
    current.hasLongestRoad = !current.hasLongestRoad;
    handleSave(updated);
  };

  const handleToggleLargestArmy = () => {
    if (!game || !player) return;
    if (!player.hasLargestArmy && !validateLargestArmy(player)) {
      Alert.alert('Largest Army', 'Player must have at least 3 knights to have Largest Army.');
      return;
    }
    const updated = { ...game };
    updated.players.forEach(p => { if (p.id !== player.id) p.hasLargestArmy = false; });
    const current = updated.players.find(p => p.id === player.id)!;
    current.hasLargestArmy = !current.hasLargestArmy;
    handleSave(updated);
  };

  const handleKnightsChange = (delta: number) => {
    if (!game || !player) return;
    const updated = { ...game };
    const current = updated.players.find(p => p.id === player.id)!;
    current.knightsCount = Math.max(0, current.knightsCount + delta);
    if (current.knightsCount < 3 && current.hasLargestArmy) current.hasLargestArmy = false;
    handleSave(updated);
  };

  const handleVPCardsChange = (delta: number) => {
    if (!game || !player) return;
    const updated = { ...game };
    const current = updated.players.find(p => p.id === player.id)!;
    current.victoryPointCards = Math.max(0, current.victoryPointCards + delta);
    handleSave(updated);
  };

  const handleDeleteBuilding = (buildingId: string) => {
    if (!game || !player) return;
    const updated = { ...game };
    const current = updated.players.find(p => p.id === player.id)!;
    current.buildings = current.buildings.filter(b => b.id !== buildingId);
    handleSave(updated);
    setShowDeleteConfirm(null);
  };

  const handleUpgradeToCity = (buildingId: string) => {
    if (!game || !player) return;
    const updated = { ...game };
    const current = updated.players.find(p => p.id === player.id)!;
    const building = current.buildings.find(b => b.id === buildingId);
    if (building?.type === 'settlement') {
      building.type = 'city';
      handleSave(updated);
    }
  };

  if (!game || !player) {
    return (
      <>
        <Stack.Screen options={{ title: 'Player', headerBackTitle: 'Game' }} />
        <ThemedView style={styles.loading}><ThemedText>Loading...</ThemedText></ThemedView>
      </>
    );
  }

  const vp = calculateVP(player);
  const settlements = player.buildings.filter(b => b.type === 'settlement');
  const cities = player.buildings.filter(b => b.type === 'city');

  return (
    <>
      <Stack.Screen options={{ title: player.name, headerBackTitle: 'Game' }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 0 }]}
      >
        <View style={[styles.card, styles.vpCard]}>
          <ThemedText type="defaultSemiBold" style={styles.vpBig}>{vp} Points</ThemedText>
          <ThemedText style={styles.breakdown}>
            Settlements: {settlements.length} × 1 = {settlements.length}{'\n'}
            Cities: {cities.length} × 2 = {cities.length * 2}{'\n'}
            Longest Road: {player.hasLongestRoad ? '2' : '0'}{'\n'}
            Largest Army: {player.hasLargestArmy ? '2' : '0'}{'\n'}
            VP Cards: {player.victoryPointCards}
          </ThemedText>
        </View>

        <Pressable style={styles.addBtn} onPress={() => (router as { push: (href: string) => void }).push(`/building/${player.id}`)}>
          <ThemedText style={styles.addBtnText}>Add Settlement</ThemedText>
        </Pressable>

        <View style={styles.card}>
          <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Buildings</ThemedText>
          {player.buildings.length === 0 ? (
            <ThemedText style={styles.empty}>No buildings yet</ThemedText>
          ) : (
            player.buildings.map((building) => (
              <View key={building.id} style={styles.buildingItem}>
                <ThemedText style={styles.buildingType}>{building.type === 'settlement' ? 'Settlement' : 'City'}</ThemedText>
                <View style={styles.tileRow}>
                  {building.tiles.map((tile) => (
                    <View key={tile.id} style={styles.tileChip}>
                      <ResourceIcon resource={tile.resource} size={28} />
                      {tile.number != null && <ThemedText style={styles.tileNum}>{tile.number}</ThemedText>}
                    </View>
                  ))}
                </View>
                <View style={styles.buildingActions}>
                  <Pressable style={styles.smallBtn} onPress={() => (router as { push: (href: string) => void }).push(`/building/${player.id}/${building.id}`)}>
                    <ThemedText style={styles.smallBtnText}>Edit</ThemedText>
                  </Pressable>
                  {building.type === 'settlement' && (
                    <Pressable style={[styles.smallBtn, styles.primaryBtn]} onPress={() => handleUpgradeToCity(building.id)}>
                      <ThemedText style={styles.primaryBtnText}>Upgrade</ThemedText>
                    </Pressable>
                  )}
                  <Pressable style={[styles.smallBtn, styles.dangerBtn]} onPress={() => setShowDeleteConfirm(building.id)}>
                    <ThemedText style={styles.dangerBtnText}>Delete</ThemedText>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Pressable style={styles.toggleRow} onPress={handleToggleLongestRoad}>
            <ThemedText style={styles.toggleLabel}>Longest Road (+2 VP)</ThemedText>
            <View style={[styles.toggle, player.hasLongestRoad && styles.toggleOn]} />
          </Pressable>
          <View style={styles.stepperRow}>
            <ThemedText style={styles.toggleLabel}>Knights Count</ThemedText>
            <View style={styles.stepper}>
              <Pressable style={styles.stepperBtn} onPress={() => handleKnightsChange(-1)} disabled={player.knightsCount === 0}>
                <ThemedText style={styles.stepperText}>−</ThemedText>
              </Pressable>
              <ThemedText style={styles.stepperValue}>{player.knightsCount}</ThemedText>
              <Pressable style={styles.stepperBtn} onPress={() => handleKnightsChange(1)}>
                <ThemedText style={styles.stepperText}>+</ThemedText>
              </Pressable>
            </View>
          </View>
          <Pressable style={styles.toggleRow} onPress={handleToggleLargestArmy}>
            <ThemedText style={styles.toggleLabel}>Largest Army (+2 VP)</ThemedText>
            <View style={[styles.toggle, player.hasLargestArmy && styles.toggleOn]} />
          </Pressable>
          <View style={styles.stepperRow}>
            <ThemedText style={styles.toggleLabel}>Victory Point Cards</ThemedText>
            <View style={styles.stepper}>
              <Pressable style={styles.stepperBtn} onPress={() => handleVPCardsChange(-1)} disabled={player.victoryPointCards === 0}>
                <ThemedText style={styles.stepperText}>−</ThemedText>
              </Pressable>
              <ThemedText style={styles.stepperValue}>{player.victoryPointCards}</ThemedText>
              <Pressable style={styles.stepperBtn} onPress={() => handleVPCardsChange(1)}>
                <ThemedText style={styles.stepperText}>+</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        <Modal visible={showDeleteConfirm !== null} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteConfirm(null)}>
            <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
              <ThemedText type="subtitle" style={styles.modalTitle}>Delete Building?</ThemedText>
              <ThemedText style={styles.modalBody}>Are you sure? This cannot be undone.</ThemedText>
              <View style={styles.modalActions}>
                <Pressable style={styles.modalBtnSecondary} onPress={() => setShowDeleteConfirm(null)}>
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
                <Pressable style={styles.modalBtnDanger} onPress={() => showDeleteConfirm && handleDeleteBuilding(showDeleteConfirm)}>
                  <ThemedText style={styles.modalBtnTextDanger}>Delete</ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 48 },
  card: { backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, marginBottom: 16 },
  vpCard: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 16 },
  vpBig: { fontSize: 28, lineHeight: 36, color: '#2563eb', marginBottom: 12 },
  breakdown: { fontSize: 14, opacity: 0.8, marginBottom: 8 },
  cardTitle: { marginBottom: 12, fontSize: 18 },
  addBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, marginBottom: 16 },
  addBtnText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '600' },
  buildingItem: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  buildingType: { fontWeight: '600', marginBottom: 8 },
  tileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tileChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tileNum: { fontSize: 16, fontWeight: '600' },
  buildingActions: { flexDirection: 'row', gap: 8 },
  smallBtn: { padding: 8, borderRadius: 6, backgroundColor: '#e5e7eb' },
  smallBtnText: { fontSize: 14 },
  primaryBtn: { backgroundColor: '#2563eb' },
  primaryBtnText: { color: '#fff', fontSize: 14 },
  dangerBtn: { backgroundColor: '#dc2626' },
  dangerBtnText: { color: '#fff', fontSize: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  toggleLabel: { fontSize: 16 },
  toggle: { width: 48, height: 26, borderRadius: 13, backgroundColor: '#e5e7eb' },
  toggleOn: { backgroundColor: '#2563eb' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  stepperText: { fontSize: 18, fontWeight: '600' },
  stepperValue: { minWidth: 24, textAlign: 'center', fontSize: 16 },
  empty: { opacity: 0.7 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { marginBottom: 12 },
  modalBody: { marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtnSecondary: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
  modalBtnDanger: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#dc2626', alignItems: 'center' },
  modalBtnTextDanger: { color: '#fff', fontWeight: '600' },
});
