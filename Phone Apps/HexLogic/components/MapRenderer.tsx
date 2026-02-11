import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Asset } from 'expo-asset';
import Svg, { G, Polygon, Text as SvgText, Image, Defs, ClipPath } from 'react-native-svg';
import type { TilePlacement, Harbor, BoardSize, TerrainType } from '@/core';
import { getTileSlots } from '@/core';
import { TILE_IMAGES } from '@/assets/images/resources/Tiles';
import { COUNTER_IMAGES } from '@/assets/images/resources/Counters';
import { HARBOR_3TO1_IMAGE, HARBOR_2TO1_IMAGE, HARBOR_RESOURCE_IMAGES } from '@/assets/images/resources/Harbors';

const TERRAIN_COLORS: Record<TerrainType, string> = {
  Wood: '#166534',
  Wool: '#f5f5f5',
  Grain: '#eab308',
  Brick: '#b91c1c',
  Ore: '#64748b',
  Desert: '#d6d3d1',
};

const AXIAL_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];

// Grid spacing: 18% closer so hex centers overlap and drawn hexes touch (no gaps)
const HEX_GRID_SPACING = 0.82;

function axialToPixel(q: number, r: number, centerX: number, centerY: number, hexSize: number): { x: number; y: number } {
  const spacing = hexSize * HEX_GRID_SPACING;
  const x = spacing * Math.sqrt(3) * (q + r / 2) + centerX;
  const y = spacing * 1.5 * r + centerY;
  return { x, y };
}

// Draw hexes larger than grid so they overlap and touch (no gaps)
const HEX_DRAW_OVERLAP = 1.12;

// Pointy-top hex centered at (0,0): flat top/bottom, radius = hexSize
function pointyHexPoints(hexSize: number): string {
  const r = hexSize;
  const s = r * Math.sqrt(3) / 2;
  return `0,${-r} ${s},${-r/2} ${s},${r/2} 0,${r} ${-s},${r/2} ${-s},${-r/2}`;
}


interface MapRendererProps {
  tiles: TilePlacement[];
  harbors?: Harbor[];
  boardSize?: BoardSize;
  onTileClick?: (tileId: number) => void;
  onHarborClick?: (harborId: string) => void;
  selectedTileId?: number | null;
  selectedHarborId?: string | null;
  width?: number;
  height?: number;
  /** When true, parent is in "generating" state; can show "Building map…" in overlay */
  mapLoading?: boolean;
  /** Called once when all assets for this board are ready and map is rendered */
  onMapReady?: () => void;
}

const DEFAULT_WIDTH = 340;
const DEFAULT_HEIGHT = 320;

/** Build deduplicated list of asset module ids used by this board only */
function getBoardAssetIds(tiles: TilePlacement[], harbors: Harbor[]): number[] {
  const ids: number[] = [];
  for (const t of tiles) {
    const tileImg = TILE_IMAGES[t.terrain];
    if (tileImg != null) ids.push(tileImg);
    if (t.number != null) {
      const counterImg = COUNTER_IMAGES[t.number];
      if (counterImg != null) ids.push(counterImg);
    }
  }
  if (harbors.length > 0) {
    ids.push(HARBOR_3TO1_IMAGE, HARBOR_2TO1_IMAGE);
    for (const h of harbors) {
      if (h.kind === '2to1' && h.resource) {
        const resImg = HARBOR_RESOURCE_IMAGES[h.resource];
        if (resImg != null) ids.push(resImg);
      }
    }
  }
  return [...new Set(ids)];
}

function MapRendererInner({
  tiles,
  harbors = [],
  boardSize = 'standard',
  onTileClick,
  onHarborClick,
  selectedTileId = null,
  selectedHarborId = null,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  mapLoading = false,
  onMapReady,
}: MapRendererProps) {
  const [assetsReady, setAssetsReady] = useState(false);
  const onMapReadyCalled = useRef(false);

  useEffect(() => {
    let cancelled = false;
    onMapReadyCalled.current = false;
    setAssetsReady(false);
    const ids = getBoardAssetIds(tiles, harbors);
    (async () => {
      const assets = ids.map((id) => Asset.fromModule(id));
      await Promise.all(assets.map((a) => a.downloadAsync()));
      if (!cancelled) setAssetsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [tiles, harbors]);

  const tileMap = useMemo(() => {
    const map = new Map<number, TilePlacement>();
    tiles.forEach(t => map.set(t.tileId, t));
    return map;
  }, [tiles]);

  const hexSize = useMemo(() => {
    const tilePx = Math.min(width * 0.24, 60);
    return tilePx / 2;
  }, [width]);

  const tileSlots = useMemo(() => getTileSlots(boardSize), [boardSize]);
  const allTileIds = useMemo(() => tileSlots.map(s => s.tileId), [tileSlots]);

  const { positions, bounds } = useMemo(() => {
    const positions: Record<number, { x: number; y: number }> = {};
    tileSlots.forEach(slot => {
      const pos = axialToPixel(slot.q, slot.r, 0, 0, hexSize);
      positions[slot.tileId] = pos;
    });
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    Object.values(positions).forEach(p => {
      const r = hexSize * 1.2;
      minX = Math.min(minX, p.x - r);
      maxX = Math.max(maxX, p.x + r);
      minY = Math.min(minY, p.y - r);
      maxY = Math.max(maxY, p.y + r);
    });
    const padding = hexSize;
    return {
      positions,
      bounds: {
        minX: minX - padding,
        minY: minY - padding,
        width: (maxX - minX) + padding * 2,
        height: (maxY - minY) + padding * 2,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
      },
    };
  }, [tileSlots, hexSize]);

  const slotByTileId = useMemo(() => {
    const map = new Map<number, { q: number; r: number }>();
    tileSlots.forEach(slot => map.set(slot.tileId, { q: slot.q, r: slot.r }));
    return map;
  }, [tileSlots]);

  const maxR = useMemo(() => Math.max(...tileSlots.map(s => s.r)), [tileSlots]);

  const harborPositions = useMemo(() => {
    return harbors.map(harbor => {
      const tilePos = positions[harbor.tileId];
      if (!tilePos) return null;
      const slot = slotByTileId.get(harbor.tileId);
      const dir = AXIAL_DIRECTIONS[harbor.edge];
      const dirPixelX = hexSize * Math.sqrt(3) * (dir.q + dir.r / 2);
      const dirPixelY = hexSize * 1.5 * dir.r;
      const len = Math.sqrt(dirPixelX * dirPixelX + dirPixelY * dirPixelY);
      const ux = len > 0 ? dirPixelX / len : 0;
      const uy = len > 0 ? dirPixelY / len : 0;
      const anchorX = tilePos.x + ux * hexSize;
      const anchorY = tilePos.y + uy * hexSize;
      const harborSize = hexSize * 0.72;
      const outset = harborSize * 0.35 * 0.25;
      const isBottomTwoRows = slot != null && slot.r >= maxR - 1;
      const bottomInset = isBottomTwoRows ? harborSize * 0.12 : 0;
      const x = anchorX + ux * (outset - bottomInset);
      const y = anchorY + uy * (outset - bottomInset);
      const angleDeg = Math.atan2(uy, ux) * (180 / Math.PI) - 180;
      return { harbor, x, y, angleDeg, harborSize };
    }).filter((p): p is NonNullable<typeof p> => p !== null);
  }, [harbors, positions, hexSize, slotByTileId, maxR]);

  const hexW = hexSize * Math.sqrt(3);
  const hexH = hexSize * 2;
  const drawSize = hexSize * HEX_DRAW_OVERLAP;
  const hexClipPoints = useMemo(() => pointyHexPoints(drawSize), [drawSize]);

  const scale = useMemo(() => {
    const scaleX = width / bounds.width;
    const scaleY = height / bounds.height;
    return Math.min(scaleX, scaleY, 1.35) * 1.15;
  }, [width, height, bounds]);

  const translateX = width / 2 - bounds.centerX * scale;
  const translateY = height / 2 - bounds.centerY * scale;

  const isInteractive = onTileClick != null && assetsReady;

  // Call onMapReady once when assets become ready (ref guard prevents double call)
  useEffect(() => {
    if (assetsReady && !onMapReadyCalled.current && onMapReady) {
      onMapReadyCalled.current = true;
      onMapReady();
    }
  }, [assetsReady, onMapReady]);

  return (
    <View
      style={[styles.container, { width, height }]}
      pointerEvents={isInteractive ? 'auto' : 'none'}
    >
      {!assetsReady && (
        <View style={[styles.loadingOverlay, { width, height }]} pointerEvents="none">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>{mapLoading ? 'Building map…' : 'Loading map…'}</Text>
        </View>
      )}
      {assetsReady && (
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <ClipPath id="hexClip">
            <Polygon points={hexClipPoints} />
          </ClipPath>
        </Defs>
        <G transform={`translate(${translateX}, ${translateY}) scale(${scale})`}>
          {/* Tile bodies first (terrain/resource only) */}
          {allTileIds.map(tileId => {
            const tile = tileMap.get(tileId);
            const pos = positions[tileId];
            if (!pos || !tile) return null;
            const fill = TERRAIN_COLORS[tile.terrain] ?? '#9ca3af';
            const tileImage = TILE_IMAGES[tile.terrain];
            const drawW = hexW * HEX_DRAW_OVERLAP;
            const drawH = hexH * HEX_DRAW_OVERLAP;
            const dimmed = (selectedTileId != null && selectedTileId !== tileId) || selectedHarborId != null;
            return (
              <G
                key={`tile-${tileId}`}
                transform={`translate(${pos.x}, ${pos.y})`}
                opacity={dimmed ? 0.35 : 1}
              >
                {tileImage ? (
                  <Image
                    href={tileImage}
                    x={-drawW / 2}
                    y={-drawH / 2}
                    width={drawW}
                    height={drawH}
                    clipPath="url(#hexClip)"
                    preserveAspectRatio="xMidYMid slice"
                    onPress={() => onTileClick?.(tileId)}
                  />
                ) : (
                  <Polygon
                    points={pointyHexPoints(drawSize)}
                    fill={fill}
                    stroke="none"
                    strokeWidth={0}
                    onPress={() => onTileClick?.(tileId)}
                  />
                )}
              </G>
            );
          })}
          {/* Counters on top, at bottom edge of each tile */}
          {allTileIds.map(tileId => {
            const tile = tileMap.get(tileId);
            const pos = positions[tileId];
            if (!pos || !tile || tile.number == null) return null;
            const dimmed = (selectedTileId != null && selectedTileId !== tileId) || selectedHarborId != null;
            const counterSize = hexSize * 0.9;
            const counterImage = COUNTER_IMAGES[tile.number];
            const bottomPadding = hexSize * 0.52;
            const counterY = hexSize - counterSize / 2 - bottomPadding;
            return (
              <G
                key={`counter-${tileId}`}
                transform={`translate(${pos.x}, ${pos.y})`}
                opacity={dimmed ? 0.35 : 1}
              >
                {counterImage ? (
                  <Image
                    href={counterImage}
                    x={-counterSize / 2}
                    y={counterY}
                    width={counterSize}
                    height={counterSize}
                    preserveAspectRatio="xMidYMid meet"
                    onPress={() => onTileClick?.(tileId)}
                  />
                ) : (
                  <SvgText
                    x={0}
                    y={counterY + counterSize / 2}
                    fill="#111"
                    fontSize={Math.max(12, hexSize * 0.5)}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {tile.number}
                  </SvgText>
                )}
              </G>
            );
          })}
          {harborPositions.map(({ harbor, x, y, angleDeg, harborSize }) => {
            const is3to1 = harbor.kind === '3to1';
            const harborImage = is3to1 ? HARBOR_3TO1_IMAGE : HARBOR_2TO1_IMAGE;
            const drawSize = harborSize * 1.1;
            const half = drawSize / 2;
            const resourceIconSize = drawSize * 0.28;
            const resourceOffsetX = drawSize * 0.15;
            const resourceOffsetY = -drawSize * 0.25;
            const resourceImage = !is3to1 && harbor.resource ? HARBOR_RESOURCE_IMAGES[harbor.resource] : null;
            const harborDimmed = selectedTileId != null || (selectedHarborId != null && harbor.id !== selectedHarborId);
            const handleHarborPress = () => onHarborClick?.(harbor.id);
            return (
              <G
                key={harbor.id}
                transform={`translate(${x}, ${y}) rotate(${angleDeg})`}
                opacity={harborDimmed ? 0.35 : 1}
              >
                <Image
                  href={harborImage}
                  x={-half}
                  y={-half}
                  width={drawSize}
                  height={drawSize}
                  preserveAspectRatio="xMidYMid meet"
                  onPress={handleHarborPress}
                />
                {resourceImage != null && (
                  <Image
                    href={resourceImage}
                    x={resourceOffsetX - resourceIconSize / 2}
                    y={resourceOffsetY - resourceIconSize / 2}
                    width={resourceIconSize}
                    height={resourceIconSize}
                    preserveAspectRatio="xMidYMid meet"
                    onPress={handleHarborPress}
                  />
                )}
              </G>
            );
          })}
        </G>
      </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
});

export const MapRenderer = React.memo(MapRendererInner);
