import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Game, GameMode, PlayerColor } from '@/core';
import { generateId } from '@/core';
import { clearGame, saveGame } from '@/utils/storage';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const VP_OPTIONS = Array.from({ length: 16 }, (_, i) => i + 5);
const PLAYER_COUNT_OPTIONS = [3, 4, 5, 6];

const PLAYER_COLORS: PlayerColor[] = ['Red', 'Blue', 'White', 'Orange', 'Green', 'Brown'];
const COLOR_HEX: Record<PlayerColor, string> = {
  Red: '#dc2626',
  Blue: '#2563eb',
  White: '#f5f5f5',
  Orange: '#ea580c',
  Green: '#16a34a',
  Brown: '#78350f',
};

export default function NewGameScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'mode' | 'config'>('mode');
  const [mode, setMode] = useState<GameMode | null>(null);
  const [vpTarget, setVpTarget] = useState(10);
  const [numPlayers, setNumPlayers] = useState(4);
  const [players, setPlayers] = useState<Array<{ name: string; color: PlayerColor | null }>>([]);
  const [soloName, setSoloName] = useState('Me');
  const [soloColor, setSoloColor] = useState<PlayerColor | null>(null);
  const [trackBuildings, setTrackBuildings] = useState(true);
  const [trackResourceHand, setTrackResourceHand] = useState(true);
  const [vpPickerOpen, setVpPickerOpen] = useState(false);
  const [playersPickerOpen, setPlayersPickerOpen] = useState(false);

  const handleModeSelect = (selectedMode: GameMode) => {
    setMode(selectedMode);
    if (selectedMode === 'full') {
      setPlayers(Array.from({ length: numPlayers }, () => ({ name: '', color: null as PlayerColor | null })));
    }
    setStep('config');
  };

  const handlePlayerNameChange = (index: number, name: string) => {
    const next = [...players];
    next[index] = { ...next[index], name };
    setPlayers(next);
  };

  const handlePlayerColorChange = (index: number, color: PlayerColor) => {
    const next = [...players];
    next[index] = { ...next[index], color };
    setPlayers(next);
  };

  const handleStartGame = async () => {
    await clearGame();

    const game: Game = {
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mode: mode!,
      vpTarget,
      players: [],
      robber: {},
    };

    if (mode === 'full') {
      const allHaveNames = players.every(p => p.name.trim());
      const allHaveColors = players.every(p => p.color !== null);
      const uniqueColors = new Set(players.map(p => p.color)).size === players.length;
      if (!allHaveNames || !allHaveColors || !uniqueColors) {
        Alert.alert('Setup', 'Please ensure all players have unique names and colors.');
        return;
      }
      game.players = players.map(p => ({
        id: generateId(),
        name: p.name.trim(),
        color: p.color!,
        knightsCount: 0,
        hasLongestRoad: false,
        hasLargestArmy: false,
        victoryPointCards: 0,
        buildings: [],
      }));
    } else {
      game.soloSettings = { trackBuildings, trackResourceHand };
      if (trackBuildings || trackResourceHand) {
        game.players = [{
          id: generateId(),
          name: soloName.trim() || 'Me',
          color: soloColor || 'Red',
          knightsCount: 0,
          hasLongestRoad: false,
          hasLargestArmy: false,
          victoryPointCards: 0,
          buildings: [],
          resourceHand: trackResourceHand ? { Brick: 0, Lumber: 0, Wool: 0, Grain: 0, Ore: 0 } : undefined,
        }];
      }
    }

    await saveGame(game);
    router.replace('/dashboard');
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: step === 'mode' ? 'New Game' : 'Setup',
          headerBackTitle: 'Home',
        }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 + 320 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator
        >
          <Pressable style={styles.scrollContentInner} onPress={Keyboard.dismiss} accessible={false}>
            <ThemedView style={styles.container}>
              {step === 'mode' && (
            <>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Choose Game Mode</ThemedText>
              <Pressable
                style={({ pressed }) => [styles.modeBtn, styles.modeBtnPrimary, pressed && styles.pressed]}
                onPress={() => handleModeSelect('full')}
              >
                <ThemedText style={styles.modeBtnText}>Full Game Tracker</ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modeBtn, styles.modeBtnPrimary, pressed && styles.pressed]}
                onPress={() => handleModeSelect('solo')}
              >
                <ThemedText style={styles.modeBtnText}>Solo Resource Tracker</ThemedText>
              </Pressable>
            </>
              )}

              {step === 'config' && (
            <>
              <Pressable style={styles.changeModeWrap} onPress={() => setStep('mode')}>
                <ThemedText style={styles.changeModeText}>Change Mode</ThemedText>
              </Pressable>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Victory Points to Win</ThemedText>
                <Pressable
                  style={styles.dropdown}
                  onPress={() => setVpPickerOpen(true)}
                >
                  <ThemedText style={styles.dropdownText}>{vpTarget}</ThemedText>
                  <ThemedText style={styles.dropdownChevron}>▼</ThemedText>
                </Pressable>
              </View>

              <Modal visible={vpPickerOpen} transparent animationType="fade">
                <Pressable style={styles.pickerOverlay} onPress={() => setVpPickerOpen(false)}>
                  <Pressable style={styles.pickerBox} onPress={(e) => e.stopPropagation()}>
                    <ThemedText style={styles.pickerTitle}>Victory Points to Win</ThemedText>
                    <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                      {VP_OPTIONS.map((val) => (
                        <Pressable
                          key={val}
                          style={[styles.pickerItem, vpTarget === val && styles.pickerItemSelected]}
                          onPress={() => {
                            setVpTarget(val);
                            setVpPickerOpen(false);
                          }}
                        >
                          <ThemedText style={vpTarget === val ? styles.pickerItemTextSelected : styles.pickerItemText}>{val}</ThemedText>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </Pressable>
                </Pressable>
              </Modal>

              {mode === 'full' && (
                <>
                  <View style={styles.formGroup}>
                    <ThemedText style={styles.label}>Number of Players</ThemedText>
                    <Pressable
                      style={styles.dropdown}
                      onPress={() => setPlayersPickerOpen(true)}
                    >
                      <ThemedText style={styles.dropdownText}>{numPlayers}</ThemedText>
                      <ThemedText style={styles.dropdownChevron}>▼</ThemedText>
                    </Pressable>
                  </View>

                  <Modal visible={playersPickerOpen} transparent animationType="fade">
                    <Pressable style={styles.pickerOverlay} onPress={() => setPlayersPickerOpen(false)}>
                      <Pressable style={styles.pickerBox} onPress={(e) => e.stopPropagation()}>
                        <ThemedText style={styles.pickerTitle}>Number of Players</ThemedText>
                        {PLAYER_COUNT_OPTIONS.map((n) => (
                          <Pressable
                            key={n}
                            style={[styles.pickerItem, numPlayers === n && styles.pickerItemSelected]}
                            onPress={() => {
                              setNumPlayers(n);
                              setPlayers(prev =>
                                Array.from({ length: n }, (_, i) => prev[i] ?? { name: '', color: null })
                              );
                              setPlayersPickerOpen(false);
                            }}
                          >
                            <ThemedText style={numPlayers === n ? styles.pickerItemTextSelected : styles.pickerItemText}>{n}</ThemedText>
                          </Pressable>
                        ))}
                      </Pressable>
                    </Pressable>
                  </Modal>

                  {players.map((player, index) => (
                    <View key={index} style={styles.card}>
                      <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Player {index + 1}</ThemedText>
                      <View style={styles.formGroup}>
                        <ThemedText style={styles.label}>Name</ThemedText>
                        <TextInput
                          style={styles.input}
                          value={player.name}
                          onChangeText={(text) => handlePlayerNameChange(index, text)}
                          placeholder={`Player ${index + 1}`}
                          placeholderTextColor="#9ca3af"
                        />
                      </View>
                      <View style={styles.formGroup}>
                        <ThemedText style={styles.label}>Color</ThemedText>
                        <View style={styles.colorRow}>
                          {PLAYER_COLORS.map((color) => {
                            const isUsed = players.some((p, i) => i !== index && p.color === color);
                            return (
                              <Pressable
                                key={color}
                                style={[
                                  styles.colorDot,
                                  { backgroundColor: COLOR_HEX[color], borderWidth: player.color === color ? 3 : 0, borderColor: '#111', opacity: isUsed ? 0.4 : 1 },
                                ]}
                                onPress={() => !isUsed && handlePlayerColorChange(index, color)}
                                disabled={isUsed}
                              />
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {mode === 'solo' && (
                <>
                  <View style={styles.formGroup}>
                    <ThemedText style={styles.label}>My Name</ThemedText>
                    <TextInput
                      style={styles.input}
                      value={soloName}
                      onChangeText={setSoloName}
                      placeholder="Me"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <ThemedText style={styles.label}>Color (Optional)</ThemedText>
                    <View style={styles.colorRow}>
                      {PLAYER_COLORS.map((color) => (
                        <Pressable
                          key={color}
                          style={[
                            styles.colorDot,
                            { backgroundColor: COLOR_HEX[color], borderWidth: soloColor === color ? 3 : 0, borderColor: '#111' },
                          ]}
                          onPress={() => setSoloColor(color)}
                        />
                      ))}
                    </View>
                  </View>
                  <Pressable
                    style={styles.toggleRow}
                    onPress={() => setTrackBuildings(!trackBuildings)}
                  >
                    <ThemedText style={styles.toggleLabel}>Track my buildings for auto payouts</ThemedText>
                    <View style={[styles.toggle, trackBuildings && styles.toggleOn]} />
                  </Pressable>
                  <Pressable
                    style={styles.toggleRow}
                    onPress={() => setTrackResourceHand(!trackResourceHand)}
                  >
                    <ThemedText style={styles.toggleLabel}>Track my resource hand</ThemedText>
                    <View style={[styles.toggle, trackResourceHand && styles.toggleOn]} />
                  </Pressable>
                </>
              )}

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                onPress={handleStartGame}
              >
                <ThemedText style={styles.primaryBtnText}>START GAME</ThemedText>
              </Pressable>
            </>
              )}
            </ThemedView>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24 },
  scrollContentInner: { flexGrow: 1 },
  container: { flex: 1 },
  sectionTitle: { marginBottom: 24, textAlign: 'center' },
  modeBtn: { padding: 20, borderRadius: 12, marginBottom: 12 },
  modeBtnPrimary: { backgroundColor: '#2563eb' },
  modeBtnText: { color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  pressed: { opacity: 0.9 },
  formGroup: { marginBottom: 20 },
  label: { marginBottom: 8, fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111',
  },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  chipSelected: { backgroundColor: '#2563eb' },
  chipText: { fontSize: 16 },
  chipTextSelected: { color: '#fff', fontSize: 16 },
  card: { backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, marginBottom: 16 },
  cardTitle: { marginBottom: 12, fontSize: 18 },
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorDot: { width: 40, height: 40, borderRadius: 20 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, marginBottom: 8 },
  toggleLabel: { fontSize: 16, flex: 1 },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: '#e5e7eb' },
  toggleOn: { backgroundColor: '#2563eb' },
  changeModeWrap: { alignSelf: 'center', marginBottom: 16 },
  changeModeText: { fontSize: 16, color: '#2563eb' },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  dropdownText: { fontSize: 16, color: '#111' },
  dropdownChevron: { fontSize: 12, color: '#6b7280' },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  pickerBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: 360,
  },
  pickerScroll: { maxHeight: 280 },
  pickerTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerItemSelected: { backgroundColor: '#24B6E4' },
  pickerItemText: { fontSize: 16 },
  pickerItemTextSelected: { fontSize: 16, color: '#fff', fontWeight: '600' },
  primaryBtn: { backgroundColor: '#2563eb', padding: 18, borderRadius: 12, marginTop: 16 },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center' },
});
