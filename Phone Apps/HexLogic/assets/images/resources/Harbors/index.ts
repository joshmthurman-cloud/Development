import type { HarborResourceType } from '@/core';

export const HARBOR_3TO1_IMAGE = require('./Harbor_3to1.png');
export const HARBOR_2TO1_IMAGE = require('./Harbor_2to1.png');

/** Resource icon images for 2:1 harbor overlay (Wood, Wool, Grain, Brick, Ore) */
export const HARBOR_RESOURCE_IMAGES: Record<HarborResourceType, number> = {
  Wood: require('../wood.png'),
  Wool: require('../Wool.png'),
  Grain: require('../grain.png'),
  Brick: require('../brick.png'),
  Ore: require('../ore.png'),
};
