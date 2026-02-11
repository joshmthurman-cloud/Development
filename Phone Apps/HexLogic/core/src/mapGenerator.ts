import type {
  TilePlacement,
  TerrainType,
  GenerationOptions,
  FairnessMetrics,
  Intersection,
  BoardSize,
} from './mapBuilderTypes';
import {
  TILE_NEIGHBORS,
  TERRAIN_DISTRIBUTION,
  NUMBER_DISTRIBUTION,
  PIP_WEIGHTS,
  DEFAULT_GENERATION_OPTIONS,
} from './constants';
import { getAllTileIds, getTileSlots, getTileNeighbors } from './boardLayout';

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateTerrainList(boardSize: BoardSize = 'standard'): TerrainType[] {
  const terrainList: TerrainType[] = [];
  if (boardSize === 'standard') {
    Object.entries(TERRAIN_DISTRIBUTION).forEach(([terrain, count]) => {
      for (let i = 0; i < count; i++) terrainList.push(terrain as TerrainType);
    });
  } else {
    const scaleFactor = 30 / 19;
    Object.entries(TERRAIN_DISTRIBUTION).forEach(([terrain, count]) => {
      const scaledCount = Math.round(count * scaleFactor);
      for (let i = 0; i < scaledCount; i++) terrainList.push(terrain as TerrainType);
    });
    while (terrainList.length > 29) terrainList.pop();
    terrainList.push('Desert');
  }
  return shuffle(terrainList);
}

function generateNumberList(boardSize: BoardSize = 'standard'): (number | null)[] {
  const numberList: (number | null)[] = [];
  if (boardSize === 'standard') {
    Object.entries(NUMBER_DISTRIBUTION).forEach(([num, count]) => {
      for (let i = 0; i < count; i++) numberList.push(parseInt(num, 10));
    });
  } else {
    const scaleFactor = 30 / 19;
    Object.entries(NUMBER_DISTRIBUTION).forEach(([num, count]) => {
      const scaledCount = Math.round(count * scaleFactor);
      for (let i = 0; i < scaledCount; i++) numberList.push(parseInt(num, 10));
    });
    while (numberList.length > 29) numberList.pop();
  }
  return shuffle(numberList);
}

function hasAdjacentSixEight(placements: TilePlacement[], boardSize: BoardSize = 'standard'): boolean {
  const placementMap = new Map(placements.map(p => [p.tileId, p]));
  const slots = getTileSlots(boardSize);
  for (const placement of placements) {
    if (placement.number === 6 || placement.number === 8) {
      const neighbors = boardSize === 'standard'
        ? (TILE_NEIGHBORS[placement.tileId] || [])
        : getTileNeighbors(placement.tileId, slots);
      for (const neighborId of neighbors) {
        const neighbor = placementMap.get(neighborId);
        if (neighbor && (neighbor.number === 6 || neighbor.number === 8)) return true;
      }
    }
  }
  return false;
}

function countSameResourceClusters(placements: TilePlacement[], boardSize: BoardSize = 'standard'): number {
  const placementMap = new Map(placements.map(p => [p.tileId, p]));
  const visited = new Set<number>();
  let clusterCount = 0;
  const slots = getTileSlots(boardSize);
  for (const placement of placements) {
    if (visited.has(placement.tileId)) continue;
    const cluster: number[] = [];
    const stack = [placement.tileId];
    while (stack.length > 0) {
      const tileId = stack.pop()!;
      if (visited.has(tileId)) continue;
      visited.add(tileId);
      cluster.push(tileId);
      const currentTerrain = placementMap.get(tileId)?.terrain;
      const neighbors = boardSize === 'standard'
        ? (TILE_NEIGHBORS[tileId] || [])
        : getTileNeighbors(tileId, slots);
      for (const neighborId of neighbors) {
        const neighbor = placementMap.get(neighborId);
        if (neighbor && neighbor.terrain === currentTerrain && !visited.has(neighborId)) {
          stack.push(neighborId);
        }
      }
    }
    if (cluster.length > 2) clusterCount += cluster.length - 2;
  }
  return clusterCount;
}

export function findIntersections(placements: TilePlacement[], boardSize: BoardSize = 'standard'): Intersection[] {
  const placementMap = new Map(placements.map(p => [p.tileId, p]));
  const intersections: Intersection[] = [];
  const seen = new Set<string>();
  const slots = getTileSlots(boardSize);
  const neighborMap = new Map<number, number[]>();
  slots.forEach(slot => {
    neighborMap.set(slot.tileId, boardSize === 'standard'
      ? (TILE_NEIGHBORS[slot.tileId] || [])
      : getTileNeighbors(slot.tileId, slots));
  });
  for (const placement of placements) {
    const tileId = placement.tileId;
    const neighbors = neighborMap.get(tileId) || [];
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const neighborA = neighbors[i];
        const neighborB = neighbors[j];
        if (neighborMap.get(neighborA)?.includes(neighborB)) {
          const triple = [tileId, neighborA, neighborB].sort((a, b) => a - b);
          const key = triple.join(',');
          if (!seen.has(key)) {
            seen.add(key);
            let value = 0;
            for (const tid of triple) {
              const tile = placementMap.get(tid);
              if (tile && tile.number !== null) value += PIP_WEIGHTS[tile.number] || 0;
            }
            intersections.push({ tiles: triple, value } as Intersection);
          }
        }
      }
    }
  }
  return intersections;
}

export function calculateFairnessMetrics(
  placements: TilePlacement[],
  boardSize: BoardSize = 'standard'
): FairnessMetrics {
  const intersections = findIntersections(placements, boardSize);
  const pipTotalsByResource: Record<TerrainType, number> = {
    Wood: 0, Wool: 0, Grain: 0, Brick: 0, Ore: 0, Desert: 0,
  };
  for (const placement of placements) {
    if (placement.number !== null && placement.terrain !== 'Desert') {
      pipTotalsByResource[placement.terrain] += PIP_WEIGHTS[placement.number] || 0;
    }
  }
  const strongestIntersection = intersections.length > 0
    ? Math.max(...intersections.map(i => i.value))
    : 0;
  const topIntersections = [...intersections].sort((a, b) => b.value - a.value).slice(0, 5);
  const hasAdjacentSixEightViolation = hasAdjacentSixEight(placements, boardSize);
  const averageIntersectionValue = intersections.length > 0
    ? intersections.reduce((sum, i) => sum + i.value, 0) / intersections.length
    : 0;
  let score = 0;
  if (hasAdjacentSixEightViolation) score += 10000;
  const pipValues = Object.values(pipTotalsByResource).filter(v => v > 0);
  if (pipValues.length > 0) {
    score += (Math.max(...pipValues) - Math.min(...pipValues)) * 10;
  }
  if (strongestIntersection > 11) score += (strongestIntersection - 11) * 50;
  return {
    pipTotalsByResource,
    strongestIntersection,
    topIntersections,
    hasAdjacentSixEight: hasAdjacentSixEightViolation,
    averageIntersectionValue,
    score,
  };
}

function generateMapCandidate(
  options: GenerationOptions = DEFAULT_GENERATION_OPTIONS,
  boardSize: BoardSize = 'standard'
): TilePlacement[] {
  const allTileIds = getAllTileIds(boardSize);
  const terrainList = generateTerrainList(boardSize);
  const numberList = generateNumberList(boardSize);
  const slots = getTileSlots(boardSize);
  let availableTileIds = [...allTileIds];
  if (options.desertPlacement === 'no-corners') {
    const cornerTiles = slots
      .filter(slot => getTileNeighbors(slot.tileId, slots).length <= 2)
      .map(slot => slot.tileId);
    availableTileIds = allTileIds.filter(id => !cornerTiles.includes(id));
  }
  const desertIndex = terrainList.findIndex(t => t === 'Desert');
  const desertTileId = availableTileIds[Math.floor(Math.random() * availableTileIds.length)];
  const result: TilePlacement[] = [
    { tileId: desertTileId, terrain: 'Desert', number: null },
  ];
  const remainingTileIds = allTileIds.filter(id => id !== desertTileId);
  const remainingTerrains = terrainList.filter((_, i) => i !== desertIndex);
  for (let i = 0; i < remainingTerrains.length; i++) {
    result.push({
      tileId: remainingTileIds[i],
      terrain: remainingTerrains[i],
      number: null,
    });
  }
  const tilesNeedingNumbers = result.filter(p => p.terrain !== 'Desert');
  let numberIndex = 0;
  for (const placement of tilesNeedingNumbers) {
    if (numberIndex < numberList.length) {
      placement.number = numberList[numberIndex];
      numberIndex++;
    }
  }
  return result;
}

function scoreMapCandidate(
  placements: TilePlacement[],
  options: GenerationOptions,
  boardSize: BoardSize = 'standard'
): number {
  const metrics = calculateFairnessMetrics(placements, boardSize);
  let score = metrics.score;
  if (options.limitSameResourceAdjacency) {
    score += countSameResourceClusters(placements, boardSize) * 20;
  }
  if (options.maxIntersectionValueCap) {
    if (metrics.strongestIntersection > options.intersectionCapValue) {
      score += (metrics.strongestIntersection - options.intersectionCapValue) * 100;
    }
  }
  return score;
}

function checkConstraints(candidate: TilePlacement[], boardSize: BoardSize = 'standard'): boolean {
  return !hasAdjacentSixEight(candidate, boardSize);
}

export function generateMap(
  options: GenerationOptions = DEFAULT_GENERATION_OPTIONS,
  candidateCount: number = 1000,
  boardSize: BoardSize = 'standard'
): TilePlacement[] {
  let bestPlacements: TilePlacement[] | null = null;
  let bestScore = Infinity;
  for (let i = 0; i < candidateCount; i++) {
    const candidate = generateMapCandidate(options, boardSize);
    if (!checkConstraints(candidate, boardSize)) continue;
    const score = scoreMapCandidate(candidate, options, boardSize);
    if (score < bestScore) {
      bestScore = score;
      bestPlacements = candidate;
    }
    if (score === 0) break;
  }
  if (!bestPlacements) {
    for (let i = 0; i < candidateCount * 2; i++) {
      const candidate = generateMapCandidate(options, boardSize);
      if (checkConstraints(candidate, boardSize)) {
        bestPlacements = candidate;
        break;
      }
    }
  }
  return bestPlacements || generateMapCandidate(options, boardSize);
}
