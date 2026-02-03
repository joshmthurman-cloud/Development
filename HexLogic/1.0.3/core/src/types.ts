export type GameMode = 'full' | 'solo';

export type ResourceType = 'Brick' | 'Lumber' | 'Wool' | 'Grain' | 'Ore' | 'Desert';

export type PlayerColor = 'Red' | 'Blue' | 'White' | 'Orange' | 'Green' | 'Brown';

export type BuildingType = 'settlement' | 'city';

export interface ResourceCounts {
  Brick: number;
  Lumber: number;
  Wool: number;
  Grain: number;
  Ore: number;
}

export interface Tile {
  id: string;
  resource: ResourceType;
  number: number | null;
}

export interface Building {
  id: string;
  type: BuildingType;
  tiles: Tile[];
}

export interface BlockedTileSelection {
  playerId: string;
  buildingId: string;
  tileId: string;
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  knightsCount: number;
  hasLongestRoad: boolean;
  hasLargestArmy: boolean;
  victoryPointCards: number;
  buildings: Building[];
  resourceHand?: ResourceCounts;
}

export interface Game {
  id: string;
  createdAt: number;
  updatedAt: number;
  mode: GameMode;
  vpTarget: number;
  players: Player[];
  robber: {
    blockedTileSelections?: BlockedTileSelection[];
  };
  soloSettings?: {
    trackBuildings: boolean;
    trackResourceHand: boolean;
  };
}

export interface RollResult {
  die1: number;
  die2: number;
  total: number;
}

export interface Payout {
  playerId: string;
  playerName: string;
  resources: Partial<ResourceCounts>;
  blockedResources?: Partial<ResourceCounts>;
}
