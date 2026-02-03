import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Game } from '@/core';
import type { BoardState } from '@/core';

// Game storage – same keys as web
const STORAGE_KEY = 'catan-counter-game';

export async function saveGame(game: Game): Promise<void> {
  game.updatedAt = Date.now();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(game));
}

export async function loadGame(): Promise<Game | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as Game;
  } catch {
    return null;
  }
}

export async function clearGame(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function hasSavedGame(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value !== null;
  } catch {
    return false;
  }
}

// Map builder storage – same keys as web
const BOARDS_KEY = 'catan-map-builder-boards';
const CURRENT_BOARD_KEY = 'catan-map-builder-current';

export async function loadAllBoards(): Promise<BoardState[]> {
  try {
    const stored = await AsyncStorage.getItem(BOARDS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as BoardState[];
  } catch {
    return [];
  }
}

export async function loadBoard(id: string): Promise<BoardState | null> {
  const boards = await loadAllBoards();
  return boards.find(b => b.id === id) || null;
}

export async function saveBoard(board: BoardState): Promise<void> {
  board.updatedAt = Date.now();
  const boards = await loadAllBoards();
  const index = boards.findIndex(b => b.id === board.id);
  const next = index >= 0 ? boards.map((b, i) => (i === index ? board : b)) : [...boards, board];
  await AsyncStorage.setItem(BOARDS_KEY, JSON.stringify(next));
}

export async function deleteBoard(id: string): Promise<void> {
  const boards = await loadAllBoards();
  await AsyncStorage.setItem(BOARDS_KEY, JSON.stringify(boards.filter(b => b.id !== id)));
}

export async function getCurrentBoard(): Promise<BoardState | null> {
  try {
    const stored = await AsyncStorage.getItem(CURRENT_BOARD_KEY);
    if (!stored) return null;
    const boardId = JSON.parse(stored) as string;
    return loadBoard(boardId);
  } catch {
    return null;
  }
}

export async function setCurrentBoard(boardId: string): Promise<void> {
  await AsyncStorage.setItem(CURRENT_BOARD_KEY, JSON.stringify(boardId));
}

export function generateBoardId(): string {
  return `board-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
