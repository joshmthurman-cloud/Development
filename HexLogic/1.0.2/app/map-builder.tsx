import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Modal, Dimensions, InteractionManager } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Stack } from 'expo-router';
import { MapRenderer } from '@/components/MapRenderer';
import type {
  BoardState,
  TilePlacement,
  GenerationOptions,
  TerrainType,
  PlayerCount,
  BoardSize,
} from '@/core';
import { generateMap, calculateFairnessMetrics, autoPlaceHarbors } from '@/core';
import { DEFAULT_GENERATION_OPTIONS } from '@/core';
import {
  saveBoard,
  getCurrentBoard,
  setCurrentBoard,
  generateBoardId,
} from '@/utils/storage';

type Tab = 'auto' | 'manual' | 'analyze';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH - 48;
const MAP_HEIGHT = 300;

function MapViewerModalContent({
  onClose,
  board,
  showHarbors,
  boardSize,
  viewerSelectedTileId,
  viewerSelectedHarborId,
  onTileSelect,
  onHarborSelect,
}: {
  onClose: () => void;
  board: BoardState | null;
  showHarbors: boolean;
  boardSize: BoardSize;
  viewerSelectedTileId: number | null;
  viewerSelectedHarborId: string | null;
  onTileSelect: (tileId: number) => void;
  onHarborSelect: (harborId: string) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = Math.min(Math.max(scale.value, 0.5), 4);
      scale.value = savedScale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const [mapContentReady, setMapContentReady] = useState(false);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setMapContentReady(true));
    return () => task.cancel();
  }, []);

  if (!board) return null;

  return (
    <View style={styles.modalOverlay}>
      <Pressable style={styles.modalCloseArea} onPress={onClose} />
      <View style={styles.modalMapContainer} pointerEvents="box-none">
        {!mapContentReady ? (
          <View style={styles.viewerTileInfo}>
            <ThemedText style={styles.viewerTileInfoText}>Loading map…</ThemedText>
          </View>
        ) : (
          <>
        {viewerSelectedTileId != null && (() => {
          const tile = board.tiles.find(t => t.tileId === viewerSelectedTileId);
          if (!tile) return null;
          return (
            <View style={styles.viewerTileInfo}>
              <ThemedText style={styles.viewerTileInfoText}>
                Tile {tile.tileId}: {tile.terrain}
                {tile.terrain !== 'Desert' && tile.number != null ? ` · ${tile.number}` : ''}
              </ThemedText>
            </View>
          );
        })()}
        {viewerSelectedHarborId != null && (() => {
          const harbor = board.harbors?.find(h => h.id === viewerSelectedHarborId);
          if (!harbor) return null;
          return (
            <View style={styles.viewerTileInfo}>
              <ThemedText style={styles.viewerTileInfoText}>
                Harbor: {harbor.kind === '3to1' ? '3:1 (any resource)' : `2:1 ${harbor.resource ?? '—'}`}
              </ThemedText>
            </View>
          );
        })()}
        <GestureDetector gesture={composed}>
          <Animated.View style={[styles.modalMapWrap, animatedStyle]}>
            <View style={styles.modalMap}>
              <MapRenderer
                tiles={board.tiles}
                harbors={showHarbors ? board.harbors ?? [] : []}
                boardSize={boardSize}
                width={SCREEN_WIDTH}
                height={400}
                onTileClick={onTileSelect}
                onHarborClick={onHarborSelect}
                selectedTileId={viewerSelectedTileId}
                selectedHarborId={viewerSelectedHarborId}
              />
            </View>
          </Animated.View>
        </GestureDetector>
          </>
        )}
      </View>
      <Pressable style={styles.closeBtn} onPress={onClose}>
        <ThemedText style={styles.closeBtnText}>Close</ThemedText>
      </Pressable>
    </View>
  );
}

export default function MapBuilderScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('auto');
  const [board, setBoard] = useState<BoardState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [options, setOptions] = useState<GenerationOptions>(DEFAULT_GENERATION_OPTIONS);
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);
  const [playerRange, setPlayerRange] = useState<'3-4' | '5-6'>('3-4');
  const [showHarbors, setShowHarbors] = useState(true);
  const [mapViewerOpen, setMapViewerOpen] = useState(false);
  const [viewerSelectedTileId, setViewerSelectedTileId] = useState<number | null>(null);
  const [viewerSelectedHarborId, setViewerSelectedHarborId] = useState<string | null>(null);
  const [viewerOpenCount, setViewerOpenCount] = useState(0);

  const boardSize: BoardSize = playerRange === '3-4' ? 'standard' : 'extended';
  const playerCount: PlayerCount = playerRange === '3-4' ? 4 : 6;

  const boardMatchesSettings = useMemo(() => {
    if (!board || board.tiles.length === 0) return false;
    const currentSize = board.boardSize ?? (board.playerCount && board.playerCount > 4 ? 'extended' : 'standard');
    const expectedSize = playerRange === '3-4' ? 'standard' : 'extended';
    const expectedCount = expectedSize === 'standard' ? 19 : 30;
    return currentSize === expectedSize && board.tiles.length === expectedCount;
  }, [board, playerRange]);

  useEffect(() => {
    let mounted = true;
    getCurrentBoard().then((current) => {
      if (!mounted) return;
      if (current) {
        setBoard(current);
        if (current.playerCount) setPlayerRange(current.playerCount <= 4 ? '3-4' : '5-6');
        if (!current.harbors) current.harbors = [];
        if (!current.boardSize) current.boardSize = (current.playerCount && current.playerCount > 4) ? 'extended' : 'standard';
      } else {
        const newBoard: BoardState = {
          id: generateBoardId(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tiles: [],
          harbors: [],
          playerCount: 4,
          boardSize: 'standard',
        };
        setBoard(newBoard);
        setCurrentBoard(newBoard.id);
      }
    });
    return () => { mounted = false; };
  }, []);

  const handleSaveBoard = async (updatedBoard: BoardState) => {
    await saveBoard(updatedBoard);
    await setCurrentBoard(updatedBoard.id);
    setBoard(updatedBoard);
  };

  const handleGenerate = async () => {
    if (!board) return;
    setIsGenerating(true);
    setMapLoading(true);
    InteractionManager.runAfterInteractions(() => {
      const newTiles = generateMap(options, 800, boardSize);
      const newHarbors = showHarbors ? autoPlaceHarbors(boardSize, newTiles) : [];
      const updatedBoard: BoardState = {
        ...board,
        tiles: newTiles,
        harbors: newHarbors,
        playerCount,
        boardSize,
        updatedAt: Date.now(),
      };
      setBoard(updatedBoard);
      handleSaveBoard(updatedBoard);
      setIsGenerating(false);
      // mapLoading is cleared by MapRenderer's onMapReady when assets are preloaded
    });
  };

  const handleAutoPlaceHarbors = async () => {
    if (!board) return;
    const newHarbors = autoPlaceHarbors(boardSize, board.tiles);
    await handleSaveBoard({ ...board, harbors: newHarbors, updatedAt: Date.now() });
  };

  const handleTileClick = (tileId: number) => {
    if (activeTab === 'manual') setSelectedTileId(tileId);
  };

  const handleTerrainSelect = (terrain: TerrainType) => {
    if (!board || selectedTileId === null) return;
    const updatedTiles = [...board.tiles];
    const idx = updatedTiles.findIndex(t => t.tileId === selectedTileId);
    const newTile: TilePlacement = { tileId: selectedTileId, terrain, number: terrain === 'Desert' ? null : null };
    if (idx >= 0) updatedTiles[idx] = newTile;
    else updatedTiles.push(newTile);
    handleSaveBoard({ ...board, tiles: updatedTiles });
    setSelectedTileId(null);
  };

  const handleNumberSelect = (number: number | null) => {
    if (!board || selectedTileId === null) return;
    const updatedTiles = [...board.tiles];
    const idx = updatedTiles.findIndex(t => t.tileId === selectedTileId);
    if (idx >= 0) updatedTiles[idx].number = number;
    else updatedTiles.push({ tileId: selectedTileId, terrain: 'Desert', number });
    handleSaveBoard({ ...board, tiles: updatedTiles });
    setSelectedTileId(null);
  };

  const metrics = useMemo(() => {
    if (!board || board.tiles.length === 0) return null;
    const expectedCount = boardSize === 'standard' ? 19 : 30;
    if (board.tiles.length !== expectedCount) return null;
    return calculateFairnessMetrics(board.tiles, boardSize);
  }, [board, boardSize]);

  if (!board) {
    return (
      <>
        <Stack.Screen options={{ title: 'Map Builder', headerBackTitle: 'Home' }} />
        <ThemedView style={styles.loading}><ThemedText>Loading...</ThemedText></ThemedView>
      </>
    );
  }

  const terrains: TerrainType[] = ['Wood', 'Wool', 'Grain', 'Brick', 'Ore', 'Desert'];
  const numbers = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

  return (
    <>
      <Stack.Screen options={{ title: 'Map Builder', headerBackTitle: 'Home' }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.tabs}>
          <Pressable style={[styles.tab, activeTab === 'auto' && styles.tabActive]} onPress={() => setActiveTab('auto')}>
            <ThemedText style={[styles.tabText, activeTab === 'auto' && styles.tabTextActive]}>Auto</ThemedText>
          </Pressable>
          <Pressable style={[styles.tab, activeTab === 'manual' && styles.tabActive]} onPress={() => setActiveTab('manual')}>
            <ThemedText style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>Manual</ThemedText>
          </Pressable>
          <Pressable style={[styles.tab, activeTab === 'analyze' && styles.tabActive]} onPress={() => setActiveTab('analyze')}>
            <ThemedText style={[styles.tabText, activeTab === 'analyze' && styles.tabTextActive]}>Analyze</ThemedText>
          </Pressable>
        </View>

        {activeTab === 'auto' && (
          <>
            <View style={styles.card}>
              <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Board</ThemedText>
              <View style={styles.chipRow}>
                <Pressable style={[styles.chip, playerRange === '3-4' && styles.chipSelected]} onPress={() => setPlayerRange('3-4')}>
                  <ThemedText style={[styles.chipText, playerRange === '3-4' && styles.chipTextSelected]}>3-4 Players (19 tiles)</ThemedText>
                </Pressable>
                <Pressable style={[styles.chip, playerRange === '5-6' && styles.chipSelected]} onPress={() => setPlayerRange('5-6')}>
                  <ThemedText style={[styles.chipText, playerRange === '5-6' && styles.chipTextSelected]}>5-6 Players (30 tiles)</ThemedText>
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
              <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Options</ThemedText>
              <Pressable style={styles.toggleRow} onPress={() => setOptions({ ...options, limitSameResourceAdjacency: !options.limitSameResourceAdjacency })}>
                <ThemedText style={styles.toggleLabel}>Limit same-resource adjacency</ThemedText>
                <View style={[styles.toggle, options.limitSameResourceAdjacency && styles.toggleOn]} />
              </Pressable>
              <Pressable style={styles.toggleRow} onPress={() => setOptions({ ...options, maxIntersectionValueCap: !options.maxIntersectionValueCap })}>
                <ThemedText style={styles.toggleLabel}>Max intersection cap</ThemedText>
                <View style={[styles.toggle, options.maxIntersectionValueCap && styles.toggleOn]} />
              </Pressable>
              <Pressable style={styles.toggleRow} onPress={() => setShowHarbors(!showHarbors)}>
                <ThemedText style={styles.toggleLabel}>Show harbors</ThemedText>
                <View style={[styles.toggle, showHarbors && styles.toggleOn]} />
              </Pressable>
              <Pressable style={[styles.primaryBtn, isGenerating && styles.primaryBtnDisabled]} onPress={handleGenerate} disabled={isGenerating}>
                <ThemedText style={styles.primaryBtnText}>{isGenerating ? 'Generating...' : 'Generate Map'}</ThemedText>
              </Pressable>
            </View>

            <View style={styles.card}>
              <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Harbors</ThemedText>
              <Pressable style={styles.secondaryBtn} onPress={handleAutoPlaceHarbors}>
                <ThemedText style={styles.secondaryBtnText}>Auto-place Harbors</ThemedText>
              </Pressable>
              {board.harbors.length > 0 && (
                <ThemedText style={styles.harborCount}>
                  {board.harbors.filter(h => h.kind === '3to1').length} × 3:1, {board.harbors.filter(h => h.kind === '2to1').length} × 2:1
                </ThemedText>
              )}
            </View>

            <View style={styles.card}>
              <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Map</ThemedText>
              <Pressable
                style={[styles.mapPreview, (!boardMatchesSettings || mapLoading) && styles.mapPreviewDimmed]}
                onPress={() => boardMatchesSettings && !mapLoading && setMapViewerOpen(true)}
              >
                <MapRenderer
                  tiles={boardMatchesSettings ? board.tiles : []}
                  harbors={boardMatchesSettings && showHarbors ? board.harbors : []}
                  boardSize={boardSize}
                  width={MAP_WIDTH}
                  height={MAP_HEIGHT}
                  mapLoading={mapLoading}
                  onMapReady={() => setMapLoading(false)}
                />
              </Pressable>
              {!boardMatchesSettings && (
                <ThemedText style={styles.settingsChanged}>Settings changed. Tap "Generate Map" to update.</ThemedText>
              )}
              {metrics && (
                <View style={styles.metrics}>
                  <ThemedText style={styles.metricRow}>
                    <ThemedText type="defaultSemiBold">Adjacent 6/8: </ThemedText>
                    {metrics.hasAdjacentSixEight ? '❌ Violated' : '✅ OK'}
                  </ThemedText>
                  <ThemedText style={styles.metricRow}>Strongest intersection: {metrics.strongestIntersection.toFixed(0)}</ThemedText>
                  <ThemedText style={styles.metricRow}>Score: {metrics.score.toFixed(0)}</ThemedText>
                </View>
              )}
            </View>
          </>
        )}

        {activeTab === 'manual' && (
          <>
            <View style={styles.card}>
              <ThemedText style={styles.cardBody}>Tap a tile to set terrain and number.</ThemedText>
              <MapRenderer
                tiles={board.tiles}
                harbors={showHarbors ? board.harbors : []}
                boardSize={board.boardSize ?? boardSize}
                onTileClick={handleTileClick}
                selectedTileId={selectedTileId}
                width={MAP_WIDTH}
                height={MAP_HEIGHT}
                mapLoading={mapLoading}
                onMapReady={() => setMapLoading(false)}
              />
              {selectedTileId !== null && (
                <View style={styles.editPanel}>
                  <ThemedText type="defaultSemiBold" style={styles.editTitle}>Tile {selectedTileId}</ThemedText>
                  <ThemedText style={styles.label}>Terrain</ThemedText>
                  <View style={styles.chipRow}>
                    {terrains.map(t => (
                      <Pressable key={t} style={styles.smallChip} onPress={() => handleTerrainSelect(t)}>
                        <ThemedText style={styles.smallChipText}>{t}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  {board.tiles.find(t => t.tileId === selectedTileId)?.terrain !== 'Desert' && (
                    <>
                      <ThemedText style={styles.label}>Number</ThemedText>
                      <View style={styles.chipRow}>
                        {numbers.map(n => (
                          <Pressable key={n} style={styles.smallChip} onPress={() => handleNumberSelect(n)}>
                            <ThemedText style={styles.smallChipText}>{n}</ThemedText>
                          </Pressable>
                        ))}
                        <Pressable style={styles.smallChip} onPress={() => handleNumberSelect(null)}>
                          <ThemedText style={styles.smallChipText}>Clear</ThemedText>
                        </Pressable>
                      </View>
                    </>
                  )}
                  <Pressable style={styles.secondaryBtn} onPress={() => setSelectedTileId(null)}>
                    <ThemedText style={styles.secondaryBtnText}>Cancel</ThemedText>
                  </Pressable>
                </View>
              )}
            </View>
          </>
        )}

        {activeTab === 'analyze' && (
          <View style={styles.card}>
            <ThemedText type="defaultSemiBold" style={styles.cardTitle}>Analysis</ThemedText>
            {metrics ? (
              <>
                <ThemedText style={styles.metricRow}>Adjacent 6/8: {metrics.hasAdjacentSixEight ? '❌ Violated' : '✅ OK'}</ThemedText>
                <ThemedText style={styles.metricRow}>Strongest intersection: {metrics.strongestIntersection.toFixed(0)}</ThemedText>
                <ThemedText style={styles.metricRow}>Average intersection: {metrics.averageIntersectionValue.toFixed(2)}</ThemedText>
                <ThemedText style={styles.metricRow}>Balance score: {metrics.score.toFixed(0)}</ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.metricSection}>Pip totals by resource</ThemedText>
                {Object.entries(metrics.pipTotalsByResource).map(([res, total]) => (
                  <ThemedText key={res} style={styles.metricRow}>{res}: {total}</ThemedText>
                ))}
              </>
            ) : (
              <ThemedText style={styles.cardBody}>Generate or complete the board to see analysis.</ThemedText>
            )}
          </View>
        )}

        <Modal
          visible={mapViewerOpen}
          animationType="fade"
          onRequestClose={() => setMapViewerOpen(false)}
          onShow={() => {
            setViewerSelectedTileId(null);
            setViewerSelectedHarborId(null);
            setViewerOpenCount((c) => c + 1);
          }}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <MapViewerModalContent
            key={viewerOpenCount}
            onClose={() => setMapViewerOpen(false)}
            board={board}
            showHarbors={showHarbors}
            boardSize={boardSize}
            viewerSelectedTileId={viewerSelectedTileId}
            viewerSelectedHarborId={viewerSelectedHarborId}
            onTileSelect={(id) => {
              setViewerSelectedTileId(id);
              setViewerSelectedHarborId(null);
            }}
            onHarborSelect={(id) => {
              setViewerSelectedHarborId(id);
              setViewerSelectedTileId(null);
            }}
          />
          </GestureHandlerRootView>
        </Modal>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  tabs: { flexDirection: 'row', marginBottom: 20 },
  tab: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#f3f4f6', marginHorizontal: 4 },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { textAlign: 'center', fontSize: 14 },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, marginBottom: 16 },
  cardTitle: { marginBottom: 12, fontSize: 18 },
  cardBody: { marginBottom: 12, fontSize: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#fff', borderWidth: 2, borderColor: '#e5e7eb' },
  chipSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 14 },
  chipTextSelected: { color: '#2563eb', fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  toggleLabel: { fontSize: 16, flex: 1 },
  toggle: { width: 48, height: 26, borderRadius: 13, backgroundColor: '#e5e7eb' },
  toggleOn: { backgroundColor: '#2563eb' },
  primaryBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, marginTop: 8 },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { padding: 14, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center', marginTop: 8 },
  secondaryBtnText: { fontSize: 16 },
  mapPreview: { borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  mapPreviewDimmed: { opacity: 0.5 },
  settingsChanged: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  metrics: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  metricRow: { marginBottom: 4, fontSize: 14 },
  metricSection: { marginTop: 12, marginBottom: 4 },
  editPanel: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  editTitle: { marginBottom: 12 },
  label: { marginBottom: 8, fontSize: 14 },
  smallChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#e5e7eb', marginRight: 8, marginBottom: 8 },
  smallChipText: { fontSize: 14 },
  harborCount: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalCloseArea: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalMapContainer: { margin: 24, maxWidth: '100%' },
  modalMapWrap: { alignSelf: 'center' },
  modalMap: {},
  viewerTileInfo: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.95)', marginBottom: 12 },
  viewerTileInfoText: { fontSize: 16, fontWeight: '600' },
  closeBtn: { padding: 18, borderRadius: 8, backgroundColor: '#fff', minWidth: 120, marginTop: 12 },
  closeBtnText: { color: '#111', textAlign: 'center', fontSize: 16, fontWeight: '600' },
});
