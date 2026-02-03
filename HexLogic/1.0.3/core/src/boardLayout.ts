import type { BoardSize } from './mapBuilderTypes';

export interface TileSlot {
  tileId: number;
  q: number;
  r: number;
}

function generateSlotsFromRows(rows: number[]): TileSlot[] {
  const midRow = Math.floor(rows.length / 2);
  const slots: TileSlot[] = [];
  let tileId = 0;
  for (let ri = 0; ri < rows.length; ri++) {
    const rowLen = rows[ri];
    const r = ri - midRow;
    let qStart = -Math.floor(rowLen / 2) - Math.floor(r / 2);
    if (rows.length === 7 && (ri === 0 || ri === 2 || ri === 4 || ri === 6)) {
      qStart -= 1;
    }
    for (let ci = 0; ci < rowLen; ci++) {
      slots.push({ tileId, q: qStart + ci, r });
      tileId++;
    }
  }
  return slots;
}

export function getTileSlots(boardSize: BoardSize): TileSlot[] {
  if (boardSize === 'standard') {
    return generateSlotsFromRows([3, 4, 5, 4, 3]);
  }
  return generateSlotsFromRows([3, 4, 5, 6, 5, 4, 3]);
}

export function getAllTileIds(boardSize: BoardSize): number[] {
  return getTileSlots(boardSize).map(slot => slot.tileId);
}

export function getTileNeighbors(tileId: number, slots: TileSlot[]): number[] {
  const slot = slots.find(s => s.tileId === tileId);
  if (!slot) return [];
  const directions = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
  ];
  const neighbors: number[] = [];
  for (const dir of directions) {
    const neighborSlot = slots.find(s => s.q === slot.q + dir.q && s.r === slot.r + dir.r);
    if (neighborSlot) neighbors.push(neighborSlot.tileId);
  }
  return neighbors;
}

export function getOuterTiles(slots: TileSlot[]): number[] {
  return slots
    .filter(slot => getTileNeighbors(slot.tileId, slots).length < 6)
    .map(slot => slot.tileId);
}
