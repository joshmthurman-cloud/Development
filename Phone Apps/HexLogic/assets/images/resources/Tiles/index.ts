import type { TerrainType } from '@/core';

/**
 * Tile images for map builder. TerrainType -> image.
 * Wood -> Tile_Wood, Ore -> Tile_Rock, Desert -> Tile_Plain.
 */
export const TILE_IMAGES: Record<TerrainType, number> = {
  Wood: require('./Tile_Wood.png'),
  Wool: require('./Tile_Wool.png'),
  Grain: require('./Tile_Grain.png'),
  Brick: require('./Tile_Brick.png'),
  Ore: require('./Tile_Rock.png'),
  Desert: require('./Tile_Plain.png'),
};
