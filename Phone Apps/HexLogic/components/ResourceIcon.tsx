import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import type { ResourceType } from '@/core';
import { RESOURCE_IMAGE_SOURCES } from '@/assets/images/resources';

/**
 * Default display uses emoji + background color (RESOURCE_LABELS / RESOURCE_COLORS below).
 * These are rendered by the system, so they can look different on iOS, Android, and web.
 * To use your own images, add Brick.png, Lumber.png, Wool.png, Grain.png, Ore.png
 * in assets/images/resources/ and wire them in assets/images/resources/index.ts.
 */
const RESOURCE_COLORS: Record<string, string> = {
  Brick: '#b91c1c',
  Lumber: '#166534',
  Wool: '#f5f5f5',
  Grain: '#eab308',
  Ore: '#64748b',
  Desert: '#d6d3d1',
};

const RESOURCE_LABELS: Record<string, string> = {
  Brick: '🧱',
  Lumber: '🪵',
  Wool: '🐑',
  Grain: '🌾',
  Ore: '⛏',
  Desert: '🏜',
};

interface ResourceIconProps {
  resource: ResourceType;
  amount?: number;
  size?: number;
  blocked?: boolean;
}

const SIZE_SCALE = 1.3;

export function ResourceIcon({ resource, amount, size = 32, blocked = false }: ResourceIconProps) {
  if (resource === 'Desert') return null;
  const displaySize = size * SIZE_SCALE;
  const imageSource = RESOURCE_IMAGE_SOURCES[resource];
  const color = RESOURCE_COLORS[resource] ?? '#9ca3af';
  const label = RESOURCE_LABELS[resource] ?? resource[0];
  return (
    <View style={[styles.wrap, { opacity: blocked ? 0.5 : 1 }]}>
      {amount != null && amount > 0 && (
        <ThemedText style={[styles.amount, { fontSize: displaySize * 0.4 }]}>{amount}</ThemedText>
      )}
      <View style={[styles.circle, { width: displaySize, height: displaySize, borderRadius: displaySize / 2, backgroundColor: imageSource ? 'transparent' : color }]}>
        {imageSource ? (
          <Image source={imageSource} style={{ width: displaySize, height: displaySize }} contentFit="contain" />
        ) : (
          <ThemedText style={{ fontSize: displaySize * 0.5 }}>{label}</ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amount: { fontWeight: '600' },
  circle: { alignItems: 'center', justifyContent: 'center' },
});
