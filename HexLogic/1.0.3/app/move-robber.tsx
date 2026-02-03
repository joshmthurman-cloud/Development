import { ResourceIcon } from '@/components/ResourceIcon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { BlockedTileSelection, Game, ResourceType } from '@/core';
import { loadGame, saveGame } from '@/utils/storage';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

const RESOURCES: ResourceType[] = ['Brick', 'Lumber', 'Wool', 'Grain', 'Ore', 'Desert'];
const NUMBERS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

export default function MoveRobberScreen() {
  const { roll } = useLocalSearchParams<{ roll?: string }>();
  const rollNumber = roll != null ? parseInt(roll, 10) : undefined;
  const [game, setGame] = useState<Game | null>(null);
  const [step, setStep] = useState<'select-tile' | 'select-settlements'>('select-tile');
  const [selectedResource, setSelectedResource] = useState<ResourceType | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [selectedTiles, setSelectedTiles] = useState<BlockedTileSelection[]>([]);

  useEffect(() => {
    let mounted = true;
    loadGame().then((loaded) => {
      if (!mounted || !loaded) {
        if (mounted && !loaded) router.replace('/dashboard');
        return;
      }
      setGame(loaded);
    });
    return () => { mounted = false; };
  }, []);

  const handleTileSelect = () => {
    if (!selectedResource || (selectedResource !== 'Desert' && !selectedNumber)) {
      Alert.alert('Select', 'Please select both resource and number');
      return;
    }
    setStep('select-settlements');
  };

  const handleTileToggle = (selection: BlockedTileSelection) => {
    setSelectedTiles(prev => {
      const exists = prev.find(s => s.playerId === selection.playerId && s.buildingId === selection.buildingId && s.tileId === selection.tileId);
      if (exists) return prev.filter(s => !(s.playerId === selection.playerId && s.buildingId === selection.buildingId && s.tileId === selection.tileId));
      return [...prev, selection];
    });
  };

  const handleConfirm = async () => {
    if (!game) return;
    if (selectedTiles.length === 0) {
      Alert.alert('Select', 'Please select at least one affected settlement/city');
      return;
    }
    const updated = { ...game };
    updated.robber.blockedTileSelections = selectedTiles;
    await saveGame(updated);
    router.replace('/dashboard');
  };

  if (!game) {
    return (
      <>
        <Stack.Screen options={{ title: 'Move Robber', headerBackTitle: 'Game' }} />
        <ThemedView style={styles.loading}><ThemedText>Loading...</ThemedText></ThemedView>
      </>
    );
  }

  const matchingTiles: Array<{
    playerId: string;
    playerName: string;
    buildingId: string;
    buildingType: string;
    tileId: string;
    resource: ResourceType;
    number: number | null;
  }> = [];

  if (step === 'select-settlements' && selectedResource && selectedNumber) {
    for (const player of game.players) {
      for (const building of player.buildings) {
        for (const tile of building.tiles) {
          if (tile.resource === selectedResource && tile.number === selectedNumber) {
            matchingTiles.push({
              playerId: player.id,
              playerName: player.name,
              buildingId: building.id,
              buildingType: building.type,
              tileId: tile.id,
              resource: tile.resource,
              number: tile.number,
            });
          }
        }
      }
    }
  }

  const groupedByPlayer = matchingTiles.reduce<Record<string, { playerId: string; playerName: string; buildings: Record<string, { buildingId: string; buildingType: string; tiles: typeof matchingTiles }> }>>((acc, tile) => {
    if (!acc[tile.playerId]) acc[tile.playerId] = { playerId: tile.playerId, playerName: tile.playerName, buildings: {} };
    if (!acc[tile.playerId].buildings[tile.buildingId]) acc[tile.playerId].buildings[tile.buildingId] = { buildingId: tile.buildingId, buildingType: tile.buildingType, tiles: [] };
    acc[tile.playerId].buildings[tile.buildingId].tiles.push(tile);
    return acc;
  }, {});

  return (
    <>
      <Stack.Screen options={{ title: 'Move Robber', headerBackTitle: 'Game' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {rollNumber != null && (
          <View style={styles.resultCard}>
            <ThemedText type="defaultSemiBold" style={styles.resultText}>
              Rolled: {rollNumber}
            </ThemedText>
          </View>
        )}
        {step === 'select-tile' && (
          <>
            <View style={styles.card}>
              <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Select Robbers Tile</ThemedText>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Resource</ThemedText>
                <View style={styles.chipRow}>
                  {RESOURCES.map((r) => (
                    <Pressable
                      key={r}
                      style={[styles.chip, selectedResource === r && styles.chipSelected]}
                      onPress={() => setSelectedResource(r)}
                    >
                      <ThemedText style={[styles.chipText, selectedResource === r && styles.chipTextSelected]}>{r}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Number</ThemedText>
                <View style={styles.chipRow}>
                  {NUMBERS.map((n) => (
                    <Pressable
                      key={n}
                      style={[styles.chip, selectedNumber === n && styles.chipSelected]}
                      onPress={() => setSelectedNumber(n)}
                    >
                      <ThemedText style={[styles.chipText, selectedNumber === n && styles.chipTextSelected]}>{n}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Pressable
                style={[styles.primaryBtn, (!selectedResource || (selectedResource !== 'Desert' && !selectedNumber)) && styles.primaryBtnDisabled]}
                onPress={handleTileSelect}
                disabled={!selectedResource || (selectedResource !== 'Desert' && !selectedNumber)}
              >
                <ThemedText style={styles.primaryBtnText}>Continue</ThemedText>
              </Pressable>
            </View>
          </>
        )}

        {step === 'select-settlements' && (
          <>
            <View style={styles.card}>
              <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Select Affected Settlements/Cities</ThemedText>
              {matchingTiles.length === 0 ? (
                <ThemedText style={styles.empty}>
                  No buildings found matching {selectedResource}{selectedNumber != null ? `-${selectedNumber}` : ''}
                </ThemedText>
              ) : (
                Object.values(groupedByPlayer).map((group) => (
                  <View key={group.playerId} style={styles.playerGroup}>
                    <ThemedText type="defaultSemiBold" style={styles.playerName}>{group.playerName}</ThemedText>
                    {Object.values(group.buildings).map((building) => (
                      <View key={building.buildingId} style={styles.buildingGroup}>
                        <ThemedText style={styles.buildingType}>{building.buildingType === 'settlement' ? 'Settlement' : 'City'}</ThemedText>
                        {building.tiles.map((tile) => {
                          const selection: BlockedTileSelection = { playerId: tile.playerId, buildingId: tile.buildingId, tileId: tile.tileId };
                          const isSelected = selectedTiles.some(s => s.playerId === selection.playerId && s.buildingId === selection.buildingId && s.tileId === selection.tileId);
                          return (
                            <Pressable
                              key={tile.tileId}
                              style={[styles.tileRow, isSelected && styles.tileRowSelected]}
                              onPress={() => handleTileToggle(selection)}
                            >
                              <ResourceIcon resource={tile.resource} size={24} />
                              {tile.number != null && <ThemedText style={styles.tileNum}>{tile.number}</ThemedText>}
                            </Pressable>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                ))
              )}
            </View>
            <Pressable
              style={[styles.primaryBtn, selectedTiles.length === 0 && styles.primaryBtnDisabled]}
              onPress={handleConfirm}
              disabled={selectedTiles.length === 0}
            >
              <ThemedText style={styles.primaryBtnText}>Complete</ThemedText>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => setStep('select-tile')}>
              <ThemedText style={styles.secondaryBtnText}>Back</ThemedText>
            </Pressable>
          </>
        )}
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
  cardTitle: { marginBottom: 16, fontSize: 18 },
  formGroup: { marginBottom: 16 },
  label: { marginBottom: 8, fontSize: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#fff', borderWidth: 2, borderColor: '#e5e7eb' },
  chipSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 14 },
  chipTextSelected: { color: '#2563eb', fontWeight: '600' },
  primaryBtn: { backgroundColor: '#2563eb', padding: 18, borderRadius: 8, marginBottom: 12 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { padding: 18, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
  secondaryBtnText: { fontSize: 16 },
  empty: { textAlign: 'center', color: '#6b7280', marginBottom: 16 },
  playerGroup: { marginBottom: 20 },
  playerName: { marginBottom: 12, fontSize: 16 },
  buildingGroup: { marginLeft: 16, marginBottom: 12 },
  buildingType: { marginBottom: 8, fontWeight: '600', fontSize: 14 },
  tileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, marginBottom: 4 },
  tileRowSelected: { backgroundColor: '#fef2f2' },
  tileNum: { fontSize: 16 },
});
