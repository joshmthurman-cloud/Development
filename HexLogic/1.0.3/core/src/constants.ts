import type { TerrainType } from './mapBuilderTypes';

export const TILE_NEIGHBORS: Record<number, number[]> = {
  0: [1, 4, 3], 1: [2, 5, 4, 0], 2: [6, 5, 1], 3: [0, 4, 8, 7], 4: [0, 1, 5, 9, 8, 3],
  5: [1, 2, 6, 10, 9, 4], 6: [2, 11, 10, 5], 7: [3, 8, 12], 8: [3, 4, 9, 13, 12, 7],
  9: [4, 5, 10, 14, 13, 8], 10: [5, 6, 11, 15, 14, 9], 11: [6, 15, 10], 12: [7, 8, 13, 16],
  13: [8, 9, 14, 17, 16, 12], 14: [9, 10, 15, 18, 17, 13], 15: [10, 11, 18, 14],
  16: [12, 13, 17], 17: [13, 14, 18, 16], 18: [14, 15, 17],
};

export const ALL_TILE_IDS = Array.from({ length: 19 }, (_, i) => i);

export const TERRAIN_DISTRIBUTION: Record<TerrainType, number> = {
  Wood: 4, Wool: 4, Grain: 4, Brick: 3, Ore: 3, Desert: 1,
};

export const NUMBER_DISTRIBUTION: Record<number, number> = {
  2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1,
};

export const PIP_WEIGHTS: Record<number, number> = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
};

export const CORNER_TILES = [0, 2, 16, 18];
export const CENTER_TILE = 9;

export const DEFAULT_GENERATION_OPTIONS = {
  limitSameResourceAdjacency: true,
  balancePipsPerResource: true,
  desertPlacement: 'any' as const,
  maxIntersectionValueCap: true,
  intersectionCapValue: 11,
};
