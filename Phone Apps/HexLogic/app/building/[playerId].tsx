import { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Pressable, TextInput } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { loadGame, saveGame } from '@/utils/storage';
import type { Game, Tile, ResourceType, BuildingType } from '@/core';
import { generateId } from '@/core';
import { validateBuilding } from '@/core';
import { ResourceIcon } from '@/components/ResourceIcon';

const RESOURCES: ResourceType[] = ['Brick', 'Lumber', 'Wool', 'Grain', 'Ore', 'Desert'];
const NUMBERS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

export default function AddBuildingScreen() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([{ id: generateId(), resource: 'Brick', number: 2 }]);
  const [buildingType, setBuildingType] = useState<BuildingType>('settlement');

  useEffect(() => {
    let mounted = true;
    loadGame().then((loaded) => {
      if (!mounted || !loaded || !playerId) {
        if (mounted && loaded && !playerId) router.replace('/dashboard');
        return;
      }
      setGame(loaded);
    });
    return () => { mounted = false; };
  }, [playerId]);

  const handleAddTile = () => {
    if (tiles.length < 3) setTiles([...tiles, { id: generateId(), resource: 'Brick', number: 2 }]);
  };

  const handleRemoveTile = (tileId: string) => {
    if (tiles.length > 1) setTiles(tiles.filter(t => t.id !== tileId));
  };

  const handleTileResourceChange = (tileId: string, resource: ResourceType) => {
    setTiles(tiles.map(t => {
      if (t.id !== tileId) return t;
      const updated = { ...t, resource };
      if (resource === 'Desert') updated.number = null;
      else if (updated.number === null) updated.number = 2;
      return updated;
    }));
  };

  const handleTileNumberChange = (tileId: string, number: number | null) => {
    setTiles(tiles.map(t => t.id === tileId ? { ...t, number } : t));
  };

  const handleSave = async () => {
    if (!game || !playerId) return;
    const building = { tiles };
    const error = validateBuilding(building);
    if (error) {
      alert(error);
      return;
    }
    const player = game.players.find(p => p.id === playerId);
    if (!player) return;
    const newBuilding = {
      id: generateId(),
      type: buildingType,
      tiles: tiles.map(t => ({ ...t })),
    };
    const updated: Game = {
      ...game,
      players: game.players.map((p) =>
        p.id === playerId
          ? { ...p, buildings: [...p.buildings, newBuilding] }
          : p
      ),
    };
    await saveGame(updated);
    router.back();
  };

  if (!game) {
    return (
      <>
        <Stack.Screen options={{ title: 'Add Settlement', headerBackTitle: 'Back' }} />
        <ThemedView style={styles.loading}><ThemedText>Loading...</ThemedText></ThemedView>
      </>
    );
  }

  const player = game.players.find(p => p.id === playerId);
  if (!player) return null;

  return (
    <>
      <Stack.Screen options={{ title: 'Add Settlement', headerBackTitle: 'Back' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {tiles.map((tile, index) => (
          <View key={tile.id} style={styles.tileSlot}>
            <View style={styles.tileSlotHeader}>
              <ThemedText type="defaultSemiBold">Tile {index + 1}</ThemedText>
              {tiles.length > 1 && (
                <Pressable onPress={() => handleRemoveTile(tile.id)}>
                  <ThemedText style={styles.removeBtn}>Remove</ThemedText>
                </Pressable>
              )}
            </View>
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Resource</ThemedText>
              <View style={styles.resourceGrid}>
                {RESOURCES.map((r) => (
                  <Pressable
                    key={r}
                    style={[styles.resourceBtn, tile.resource === r && styles.resourceBtnSelected]}
                    onPress={() => handleTileResourceChange(tile.id, r)}
                  >
                    <ResourceIcon resource={r} size={36} />
                    <ThemedText style={styles.resourceLabel}>{r}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
            {tile.resource !== 'Desert' && (
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Number</ThemedText>
                <View style={styles.numberRow}>
                  {NUMBERS.map((n) => (
                    <Pressable
                      key={n}
                      style={[styles.numberChip, tile.number === n && styles.numberChipSelected]}
                      onPress={() => handleTileNumberChange(tile.id, n)}
                    >
                      <ThemedText style={[styles.numberChipText, tile.number === n && styles.numberChipTextSelected]}>{n}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        ))}
        {tiles.length < 3 && (
          <Pressable style={styles.addTileBtn} onPress={handleAddTile}>
            <ThemedText style={styles.addTileText}>Add Tile</ThemedText>
          </Pressable>
        )}
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <ThemedText style={styles.saveBtnText}>Save</ThemedText>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  tileSlot: { backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, marginBottom: 16 },
  tileSlotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  removeBtn: { color: '#dc2626', fontSize: 14 },
  formGroup: { marginBottom: 16 },
  label: { marginBottom: 8, fontSize: 16 },
  resourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resourceBtn: { padding: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 2, borderColor: '#e5e7eb', alignItems: 'center', minWidth: 80 },
  resourceBtnSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  resourceLabel: { fontSize: 12, marginTop: 4 },
  numberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  numberChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#fff', borderWidth: 2, borderColor: '#e5e7eb' },
  numberChipSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  numberChipText: { fontSize: 16 },
  numberChipTextSelected: { color: '#2563eb', fontWeight: '600' },
  addTileBtn: { padding: 16, borderRadius: 8, backgroundColor: '#e5e7eb', marginBottom: 16 },
  addTileText: { textAlign: 'center', fontSize: 16 },
  saveBtn: { backgroundColor: '#2563eb', padding: 18, borderRadius: 8 },
  saveBtnText: { color: '#fff', textAlign: 'center', fontSize: 18, fontWeight: '600' },
});
