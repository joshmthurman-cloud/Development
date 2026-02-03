import { getTileSlots, type TileSlot } from './boardLayout';
import type { BoardSize, Harbor, HarborKind, HarborResourceType } from './mapBuilderTypes';

const AXIAL_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];

function axialToPixelForAngle(q: number, r: number, hexSize: number = 1): { x: number; y: number } {
  const x = hexSize * Math.sqrt(3) * (q + r / 2);
  const y = hexSize * 1.5 * r;
  return { x, y };
}

export function autoPlaceHarbors(
  boardSize: BoardSize,
  tiles: Array<{ tileId: number }>
): Harbor[] {
  const slots = getTileSlots(boardSize);
  const tileCoordSet = new Set<string>();
  slots.forEach(slot => tileCoordSet.add(`${slot.q},${slot.r}`));

  const centerQ = slots.reduce((sum, s) => sum + s.q, 0) / slots.length;
  const centerR = slots.reduce((sum, s) => sum + s.r, 0) / slots.length;
  const hexSize = 1;
  const centerPixel = axialToPixelForAngle(centerQ, centerR, hexSize);

  const candidateEdges: Array<{
    tileId: number;
    edge: number;
    slot: TileSlot;
    angleDeg: number;
  }> = [];

  slots.forEach(slot => {
    for (let edge = 0; edge < 6; edge++) {
      const dir = AXIAL_DIRECTIONS[edge];
      const neighborQ = slot.q + dir.q;
      const neighborR = slot.r + dir.r;
      if (!tileCoordSet.has(`${neighborQ},${neighborR}`)) {
        const tilePixel = axialToPixelForAngle(slot.q, slot.r, hexSize);
        const dirPixel = axialToPixelForAngle(dir.q, dir.r, hexSize);
        const dirLength = Math.sqrt(dirPixel.x * dirPixel.x + dirPixel.y * dirPixel.y);
        const ux = dirLength > 0 ? dirPixel.x / dirLength : 0;
        const uy = dirLength > 0 ? dirPixel.y / dirLength : 0;
        const anchorX = tilePixel.x + ux * hexSize;
        const anchorY = tilePixel.y + uy * hexSize;
        const dx = anchorX - centerPixel.x;
        const dy = anchorY - centerPixel.y;
        const angleFromCenter = Math.atan2(dy, dx) * (180 / Math.PI);
        const normalizedAngle = angleFromCenter < 0 ? angleFromCenter + 360 : angleFromCenter;
        candidateEdges.push({ tileId: slot.tileId, edge, slot, angleDeg: normalizedAngle });
      }
    }
  });

  candidateEdges.sort((a, b) => a.angleDeg - b.angleDeg);

  const harborCount = 9;
  const harbor3to1Count = 4;
  const harbor2to1Count = 5;
  const resources2to1: HarborResourceType[] = ['Wood', 'Wool', 'Grain', 'Brick', 'Ore'];

  const randomOffset = Math.random() * 360;
  const rotatedCandidates = candidateEdges.map(c => ({
    ...c,
    angleDeg: (c.angleDeg + randomOffset) % 360
  }));
  rotatedCandidates.sort((a, b) => a.angleDeg - b.angleDeg);

  const step = rotatedCandidates.length / harborCount;
  const selectedIndices: number[] = [];
  for (let i = 0; i < harborCount; i++) {
    const index = Math.round(i * step);
    if (index < rotatedCandidates.length) selectedIndices.push(index);
  }

  const selectedCandidates = selectedIndices.map(rotatedIdx => {
    const rotated = rotatedCandidates[rotatedIdx];
    return candidateEdges.findIndex(c => c.tileId === rotated.tileId && c.edge === rotated.edge);
  }).filter(idx => idx >= 0);

  const harbors: Harbor[] = [];
  const shuffledResources = [...resources2to1];
  for (let i = shuffledResources.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledResources[i], shuffledResources[j]] = [shuffledResources[j], shuffledResources[i]];
  }
  let resourceIndex = 0;

  const harborKinds: HarborKind[] = [
    ...Array(harbor3to1Count).fill('3to1'),
    ...Array(harbor2to1Count).fill('2to1'),
  ];
  for (let i = harborKinds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [harborKinds[i], harborKinds[j]] = [harborKinds[j], harborKinds[i]];
  }

  for (let i = 0; i < selectedCandidates.length && i < harborKinds.length; i++) {
    const candidateIdx = selectedCandidates[i];
    const kind = harborKinds[i];
    if (candidateIdx >= 0 && candidateIdx < candidateEdges.length) {
      const candidate = candidateEdges[candidateIdx];
      if (kind === '3to1') {
        harbors.push({
          id: `H-${candidate.tileId}-E${candidate.edge}-3to1-any-${i}`,
          kind: '3to1',
          tileId: candidate.tileId,
          edge: candidate.edge as 0 | 1 | 2 | 3 | 4 | 5,
        });
      } else {
        const resource = shuffledResources[resourceIndex % shuffledResources.length];
        harbors.push({
          id: `H-${candidate.tileId}-E${candidate.edge}-2to1-${resource}-${i}`,
          kind: '2to1',
          resource,
          tileId: candidate.tileId,
          edge: candidate.edge as 0 | 1 | 2 | 3 | 4 | 5,
        });
        resourceIndex++;
      }
    }
  }

  return harbors;
}
