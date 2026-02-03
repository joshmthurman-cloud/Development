export type TerrainType = 'Wood' | 'Wool' | 'Grain' | 'Brick' | 'Ore' | 'Desert';
export type HarborKind = '3to1' | '2to1';
export type HarborResourceType = 'Wood' | 'Wool' | 'Grain' | 'Brick' | 'Ore';

export type BoardSize = 'standard' | 'extended';
export type PlayerCount = 3 | 4 | 5 | 6;

export interface TilePlacement {
  tileId: number;
  terrain: TerrainType;
  number: number | null;
}

export interface Harbor {
  id: string;
  kind: HarborKind;
  resource?: HarborResourceType;
  tileId: number;
  edge: 0 | 1 | 2 | 3 | 4 | 5;
}

export interface BoardState {
  id: string;
  createdAt: number;
  updatedAt: number;
  tiles: TilePlacement[];
  harbors: Harbor[];
  playerCount?: PlayerCount;
  boardSize?: BoardSize;
  name?: string;
}

export interface GenerationOptions {
  limitSameResourceAdjacency: boolean;
  balancePipsPerResource: boolean;
  desertPlacement: 'any' | 'center' | 'no-corners';
  maxIntersectionValueCap: boolean;
  intersectionCapValue: number;
}

export interface FairnessMetrics {
  pipTotalsByResource: Record<TerrainType, number>;
  strongestIntersection: number;
  topIntersections: Array<{ tiles: number[]; value: number }>;
  hasAdjacentSixEight: boolean;
  averageIntersectionValue: number;
  score: number;
}

export interface Intersection {
  tiles: number[];
  value: number;
}
