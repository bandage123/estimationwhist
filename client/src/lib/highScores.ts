import { GameFormat } from "@shared/schema";
import { supabase } from "./supabase";

export interface HighScoreEntry {
  id?: number;
  playerName: string;
  score: number;
  gameFormat: GameFormat;
  date: string;
}

export interface HighScores {
  traditional: HighScoreEntry[];
  keller: HighScoreEntry[];
}

const MAX_SCORES_PER_FORMAT = 10;

export async function getHighScores(): Promise<HighScores> {
  try {
    const { data, error } = await supabase
      .from('high_scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(MAX_SCORES_PER_FORMAT * 2); // Get enough for both formats

    if (error) {
      console.error("Failed to load high scores from Supabase:", error);
      return { traditional: [], keller: [] };
    }

    const traditional = (data || [])
      .filter((entry: any) => entry.game_format === 'traditional')
      .slice(0, MAX_SCORES_PER_FORMAT)
      .map((entry: any) => ({
        id: entry.id,
        playerName: entry.player_name,
        score: entry.score,
        gameFormat: entry.game_format as GameFormat,
        date: entry.created_at,
      }));

    const keller = (data || [])
      .filter((entry: any) => entry.game_format === 'keller')
      .slice(0, MAX_SCORES_PER_FORMAT)
      .map((entry: any) => ({
        id: entry.id,
        playerName: entry.player_name,
        score: entry.score,
        gameFormat: entry.game_format as GameFormat,
        date: entry.created_at,
      }));

    return { traditional, keller };
  } catch (e) {
    console.error("Failed to load high scores:", e);
    return { traditional: [], keller: [] };
  }
}

export async function saveHighScore(
  playerName: string,
  score: number,
  gameFormat: GameFormat
): Promise<{ isHighScore: boolean; rank: number | null }> {
  try {
    // First, get current high scores for this format to check if this qualifies
    const { data: existingScores, error: fetchError } = await supabase
      .from('high_scores')
      .select('*')
      .eq('game_format', gameFormat)
      .order('score', { ascending: false })
      .limit(MAX_SCORES_PER_FORMAT);

    if (fetchError) {
      console.error("Failed to fetch high scores:", fetchError);
      return { isHighScore: false, rank: null };
    }

    const scores = existingScores || [];

    // Check if this qualifies as a high score
    const wouldRank =
      scores.length < MAX_SCORES_PER_FORMAT ||
      score > scores[scores.length - 1]?.score;

    if (!wouldRank) {
      return { isHighScore: false, rank: null };
    }

    // Insert the new score
    const { data: insertedData, error: insertError } = await supabase
      .from('high_scores')
      .insert({
        player_name: playerName,
        score: score,
        game_format: gameFormat,
      })
      .select()
      .single();

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
