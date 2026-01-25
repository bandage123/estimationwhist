import { GameFormat } from "@shared/schema";
import { supabase } from "./supabase";

export interface HighScoreEntry {
  id?: number;
  playerName: string;
  score: number;
  gameFormat: GameFormat;
  isMultiplayer: boolean;
  playerCount: number;
  date: string;
}

export type GameMode = 'cpu' | 'human';
export type PlayerCount = 2 | 3 | 4 | 5 | 6 | 7;

const MAX_SCORES_PER_CATEGORY = 10;

export async function getHighScores(
  gameFormat: GameFormat,
  gameMode: GameMode,
  playerCount: PlayerCount
): Promise<HighScoreEntry[]> {
  try {
    const { data, error } = await supabase
      .from('high_scores')
      .select('*')
      .eq('game_format', gameFormat)
      .eq('is_multiplayer', gameMode === 'human')
      .eq('player_count', playerCount)
      .order('score', { ascending: false })
      .limit(MAX_SCORES_PER_CATEGORY);

    if (error) {
      console.error("Failed to load high scores from Supabase:", error);
      return [];
    }

    return (data || []).map((entry: any) => ({
      id: entry.id,
      playerName: entry.player_name,
      score: entry.score,
      gameFormat: entry.game_format as GameFormat,
      isMultiplayer: entry.is_multiplayer,
      playerCount: entry.player_count,
      date: entry.created_at,
    }));
  } catch (e) {
    console.error("Failed to load high scores:", e);
    return [];
  }
}

export async function saveHighScore(
  playerName: string,
  score: number,
  gameFormat: GameFormat,
  isMultiplayer: boolean,
  playerCount: number
): Promise<{ isHighScore: boolean; rank: number | null }> {
  try {
    // First, get current high scores for this category to check if this qualifies
    const { data: existingScores, error: fetchError } = await supabase
      .from('high_scores')
      .select('*')
      .eq('game_format', gameFormat)
      .eq('is_multiplayer', isMultiplayer)
      .eq('player_count', playerCount)
      .order('score', { ascending: false })
      .limit(MAX_SCORES_PER_CATEGORY);

    if (fetchError) {
      console.error("Failed to fetch high scores:", fetchError);
      return { isHighScore: false, rank: null };
    }

    const scores = existingScores || [];

    // Check if this qualifies as a high score
    const wouldRank =
      scores.length < MAX_SCORES_PER_CATEGORY ||
      score > scores[scores.length - 1]?.score;

    if (!wouldRank) {
      return { isHighScore: false, rank: null };
    }

    // Insert the new score
    const { error: insertError } = await supabase
      .from('high_scores')
      .insert({
        player_name: playerName,
        score: score,
        game_format: gameFormat,
        is_multiplayer: isMultiplayer,
        player_count: playerCount,
      });

    if (insertError) {
      console.error("Failed to save high score:", insertError);
      return { isHighScore: false, rank: null };
    }

    // Calculate the rank
    const rank = scores.filter(s => s.score > score).length + 1;

    return { isHighScore: true, rank };
  } catch (e) {
    console.error("Failed to save high score:", e);
    return { isHighScore: false, rank: null };
  }
}

// Note: Clearing high scores requires admin access via Supabase dashboard
// This function is kept for potential future admin functionality
export async function clearHighScores(): Promise<void> {
  console.warn("clearHighScores requires admin access - use Supabase dashboard");
}
