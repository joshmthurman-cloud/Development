/**
 * Resource image sources for ResourceIcon.
 * Empty = app uses emoji + color circles (see components/ResourceIcon.tsx).
 *
 * To use your own images: add Brick.png, Lumber.png, Wool.png, Grain.png, Ore.png
 * in this folder, then replace the empty object below with the require() map.
 */
export const RESOURCE_IMAGE_SOURCES: Partial<Record<string, number>> = {
  Brick: require('./brick.png'),
  Lumber: require('./wood.png'),
  Wool: require('./Wool.png'),
  Grain: require('./grain.png'),
  Ore: require('./ore.png'),
};
