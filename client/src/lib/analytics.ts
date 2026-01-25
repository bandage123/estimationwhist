import { GameFormat } from "@shared/schema";
import { supabase } from "./supabase";

// Log when a human player starts a game
export async function logGameStart(
  playerName: string,
  gameFormat: GameFormat,
  gameId: string
): Promise<void> {
  try {
    await supabase.from('game_starts').insert({
      player_name: playerName,
      game_format: gameFormat,
      game_id: gameId,
    });
  } catch (e) {
    // Silent fail - analytics should never break the game
    console.error("Failed to log game start:", e);
  }
}

// Log when a human player completes a game
export async function logGameCompletion(
  playerName: string,
  gameFormat: GameFormat,
  gameId: string,
  finalScore: number,
  won: boolean,
  totalTricksCalled: number
): Promise<void> {
  try {
    await supabase.from('game_completions').insert({
      player_name: playerName,
      game_format: gameFormat,
      game_id: gameId,
      final_score: finalScore,
      won: won,
      total_tricks_called: totalTricksCalled,
    });
  } catch (e) {
    // Silent fail - analytics should never break the game
    console.error("Failed to log game completion:", e);
  }
}
