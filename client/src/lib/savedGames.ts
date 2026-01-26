import { GameState } from "@shared/schema";

export interface SavedGame {
  id: string;
  savedAt: string;
  playerName: string;
  gameFormat: "traditional" | "keller";
  currentRound: number;
  playerScore: number;
  isOlympics: boolean;
  olympicsPhase?: string;
  groupNumber?: number;
  gameState: GameState;
}

const STORAGE_KEY = "whist_saved_games";
const AUTO_SAVE_KEY = "whist_auto_save";
const MAX_SAVES = 5;

export function getSavedGames(): SavedGame[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveGame(gameState: GameState, playerId: string): SavedGame {
  const saves = getSavedGames();

  // Find the human player
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) throw new Error("Player not found");

  const savedGame: SavedGame = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    playerName: player.name,
    gameFormat: gameState.gameFormat || "traditional",
    currentRound: gameState.currentRound,
    playerScore: player.score,
    isOlympics: gameState.isOlympics || false,
    olympicsPhase: gameState.olympicsState?.currentPhase,
    groupNumber: gameState.olympicsState?.currentGroupIndex !== undefined
      ? gameState.olympicsState.currentGroupIndex + 1
      : undefined,
    gameState,
  };

  // Check if we already have a save for this game (by player name and similar state)
  const existingIndex = saves.findIndex(s =>
    s.playerName === player.name &&
    s.isOlympics === savedGame.isOlympics &&
    s.gameFormat === savedGame.gameFormat
  );

  if (existingIndex >= 0) {
    // Update existing save
    saves[existingIndex] = savedGame;
  } else {
    // Add new save, remove oldest if at max
    if (saves.length >= MAX_SAVES) {
      saves.sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());
      saves.shift(); // Remove oldest
    }
    saves.push(savedGame);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
  return savedGame;
}

export function deleteSavedGame(id: string): void {
  const saves = getSavedGames();
  const filtered = saves.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function getSavedGame(id: string): SavedGame | null {
  const saves = getSavedGames();
  return saves.find(s => s.id === id) || null;
}

export function formatSaveDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Auto-save functions for automatic game persistence
export function autoSaveGame(gameState: GameState, playerId: string): void {
  try {
    // Only auto-save single player and Olympics games
    if (!gameState.isSinglePlayer && !gameState.isOlympics) return;

    // Don't auto-save if game is over
    if (gameState.phase === "game_end") return;

    // Don't auto-save lobby phase
    if (gameState.phase === "lobby") return;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    const autoSave: SavedGame = {
      id: "auto-save",
      savedAt: new Date().toISOString(),
      playerName: player.name,
      gameFormat: gameState.gameFormat || "traditional",
      currentRound: gameState.currentRound,
      playerScore: player.score,
      isOlympics: gameState.isOlympics || false,
      olympicsPhase: gameState.olympicsState?.currentPhase,
      groupNumber: gameState.olympicsState?.currentGroupIndex !== undefined
        ? gameState.olympicsState.currentGroupIndex + 1
        : undefined,
      gameState,
    };

    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(autoSave));
  } catch (e) {
    console.error("Failed to auto-save game:", e);
  }
}

export function getAutoSavedGame(): SavedGame | null {
  try {
    const data = localStorage.getItem(AUTO_SAVE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function clearAutoSave(): void {
  localStorage.removeItem(AUTO_SAVE_KEY);
}
