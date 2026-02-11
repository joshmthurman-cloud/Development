import type { Game, Player, Tile } from './types';

export function validateTile(tile: Tile): string | null {
  if (tile.resource === 'Desert') {
    if (tile.number !== null) return 'Desert tiles cannot have a number';
  } else {
    if (tile.number === null) return 'Non-desert tiles must have a number';
    if (tile.number === 7) return 'Tile numbers cannot be 7';
    if (tile.number < 2 || tile.number > 12) return 'Tile numbers must be between 2 and 12';
  }
  return null;
}

export function validateBuilding(building: { tiles: Tile[] }): string | null {
  if (building.tiles.length === 0) return 'Building must have at least one tile';
  if (building.tiles.length > 3) return 'Building cannot have more than 3 tiles';
  for (const tile of building.tiles) {
    const error = validateTile(tile);
    if (error) return error;
  }
  return null;
}

export function validatePlayer(player: Player, allPlayers: Player[]): string | null {
  if (!player.name.trim()) return 'Player name is required';
  const duplicateColor = allPlayers.find(p => p.id !== player.id && p.color === player.color);
  if (duplicateColor) return 'Color is already used by another player';
  return null;
}

export function validateGame(game: Game): string | null {
  if (game.mode === 'full') {
    if (game.players.length < 3 || game.players.length > 6) return 'Full game mode requires 3-6 players';
  }
  if (game.vpTarget < 5 || game.vpTarget > 20) return 'Victory point target must be between 5 and 20';
  for (const player of game.players) {
    const error = validatePlayer(player, game.players);
    if (error) return error;
    for (const building of player.buildings) {
      const error = validateBuilding(building);
      if (error) return error;
    }
  }
  return null;
}
