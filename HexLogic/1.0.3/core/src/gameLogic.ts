import type { Game, Player, ResourceCounts, Payout } from './types';

export function calculateVP(player: Player): number {
  let vp = 0;
  const settlements = player.buildings.filter(b => b.type === 'settlement');
  vp += settlements.length;
  const cities = player.buildings.filter(b => b.type === 'city');
  vp += cities.length * 2;
  if (player.hasLongestRoad) vp += 2;
  if (player.hasLargestArmy) vp += 2;
  vp += player.victoryPointCards;
  return vp;
}

export function calculatePayouts(
  game: Game,
  rollNumber: number
): Payout[] {
  if (rollNumber === 7) return [];
  const payouts = new Map<string, Payout>();
  const blockedTileIds = new Set(
    game.robber.blockedTileSelections?.map(bt => bt.tileId) || []
  );

  for (const player of game.players) {
    for (const building of player.buildings) {
      for (const tile of building.tiles) {
        if (tile.number !== rollNumber || tile.resource === 'Desert') continue;
        const yieldAmount = building.type === 'settlement' ? 1 : 2;
        const resourceKey = tile.resource as keyof ResourceCounts;
        if (!payouts.has(player.id)) {
          payouts.set(player.id, {
            playerId: player.id,
            playerName: player.name,
            resources: {},
            blockedResources: {},
          });
        }
        const payout = payouts.get(player.id)!;
        if (blockedTileIds.has(tile.id)) {
          payout.blockedResources![resourceKey] = (payout.blockedResources![resourceKey] || 0) + yieldAmount;
        } else {
          payout.resources[resourceKey] = (payout.resources[resourceKey] || 0) + yieldAmount;
        }
      }
    }
  }
  return Array.from(payouts.values());
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function rollDice(): { die1: number; die2: number; total: number } {
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  return { die1, die2, total: die1 + die2 };
}

export function getAvailableColors(players: Player[]): Player['color'][] {
  const allColors: Player['color'][] = ['Red', 'Blue', 'White', 'Orange', 'Green', 'Brown'];
  const usedColors = new Set(players.map(p => p.color));
  return allColors.filter(c => !usedColors.has(c));
}

export function validateLargestArmy(player: Player): boolean {
  return player.knightsCount >= 3;
}
