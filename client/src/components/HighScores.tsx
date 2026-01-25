import { useState, useEffect } from "react";
import { getHighScores, HighScoreEntry, HighScores as HighScoresType } from "@/lib/highScores";
import { GameFormat } from "@shared/schema";
import { Trophy, Medal, Award, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface HighScoresProps {
  className?: string;
  highlightFormat?: GameFormat;
}

export function HighScores({ className, highlightFormat }: HighScoresProps) {
  const [activeTab, setActiveTab] = useState<GameFormat>(highlightFormat || "traditional");
  const [highScores, setHighScores] = useState<HighScoresType>({ traditional: [], keller: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchScores() {
      setLoading(true);
      setError(false);
      try {
        const scores = await getHighScores();
        if (mounted) {
          setHighScores(scores);
          setLoading(false);
        }
      } catch (e) {
        console.error("Failed to fetch high scores:", e);
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    }

    fetchScores();

    return () => {
      mounted = false;
    };
  }, []);

  const scores = highScores[activeTab];

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (rank === 1) return <Medal className="w-4 h-4 text-gray-400" />;
    if (rank === 2) return <Award className="w-4 h-4 text-amber-600" />;
    return <span className="w-4 text-center text-xs text-muted-foreground">{rank + 1}</span>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className={cn("bg-card border rounded-lg p-4", className)}>
      <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        Global High Scores
      </h3>

      {/* Tab buttons */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setActiveTab("traditional")}
          className={cn(
            "flex-1 px-3 py-1.5 text-sm rounded-md transition-colors",
            activeTab === "traditional"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          Traditional
        </button>
        <button
          onClick={() => setActiveTab("keller")}
          className={cn(
            "flex-1 px-3 py-1.5 text-sm rounded-md transition-colors",
            activeTab === "keller"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          Keller
        </button>
      </div>

      {/* Scores list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Unable to load high scores.
        </p>
      ) : scores.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No high scores yet. Play a game to set a record!
        </p>
      ) : (
        <div className="space-y-1">
          {scores.map((entry, index) => (
            <div
              key={entry.id || `${entry.playerName}-${entry.date}`}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded",
                index === 0 && "bg-yellow-500/10",
                index === 1 && "bg-gray-500/10",
                index === 2 && "bg-amber-500/10"
              )}
            >
              <div className="w-6 flex justify-center">{getRankIcon(index)}</div>
              <span className="flex-1 font-medium text-sm truncate">{entry.playerName}</span>
              <span className="text-sm font-bold">{entry.score}</span>
              <span className="text-xs text-muted-foreground w-12 text-right">
                {formatDate(entry.date)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
