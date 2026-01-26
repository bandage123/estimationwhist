import { Player, RoundResult, roundConfigs, Suit } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trophy, Crown, Target, X, Home, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScoreBoardProps {
  players: Player[];
  roundHistory: RoundResult[];
  currentRound: number;
  showFullHistory?: boolean;
}

function TrumpIcon({ suit, className }: { suit: Suit | null; className?: string }) {
  if (suit === null) {
    return <X className={cn("w-4 h-4 text-muted-foreground", className)} />;
  }
  
  const suitSymbols: Record<Suit, { symbol: string; color: string }> = {
    clubs: { symbol: "♣", color: "text-foreground" },
    diamonds: { symbol: "♦", color: "text-red-500" },
    hearts: { symbol: "♥", color: "text-red-500" },
    spades: { symbol: "♠", color: "text-foreground" },
  };
  
  const { symbol, color } = suitSymbols[suit];
  return <span className={cn("text-lg font-bold", color, className)}>{symbol}</span>;
}

export function ScoreBoard({
  players,
  roundHistory,
  currentRound,
  showFullHistory = false,
}: ScoreBoardProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  // Get display name
  const getDisplayName = (name: string) => name;

  return (
    <Card className="h-full">
      <CardHeader className="py-1 px-2">
        <CardTitle className="flex items-center gap-1 text-xs">
          <Trophy className="w-3 h-3 text-primary" />
          Scores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 px-1 py-0.5">
        <div className="space-y-0">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              data-testid={`scoreboard-player-${player.name}`}
              className={cn(
                "flex items-center justify-between px-1 py-0.5 rounded text-[10px]",
                index === 0 && "bg-primary/10",
                player.isDealer && "ring-1 ring-primary/50"
              )}
            >
              <div className="flex items-center gap-0.5 min-w-0">
                {index === 0 && player.score > 0 && (
                  <Crown className="w-2.5 h-2.5 text-primary shrink-0" />
                )}
                <span className="font-medium truncate" title={player.name}>{getDisplayName(player.name)}</span>
                {player.isDealer && (
                  <span className="text-[8px] text-primary shrink-0">D</span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {player.call !== null && (
                  <span className="text-muted-foreground text-[9px]">
                    {player.tricksWon}/{player.call}
                  </span>
                )}
                <span className="font-bold tabular-nums" data-testid={`score-${player.name}`}>
                  {player.score}
                </span>
              </div>
            </div>
          ))}
        </div>

        {showFullHistory && roundHistory.length > 0 && (
          <RoundHistoryTable 
            players={players} 
            roundHistory={roundHistory} 
          />
        )}
      </CardContent>
    </Card>
  );
}

interface RoundHistoryTableProps {
  players: Player[];
  roundHistory: RoundResult[];
}

function RoundHistoryTable({ players, roundHistory }: RoundHistoryTableProps) {
  const cumulativeScores: Record<string, number[]> = {};
  players.forEach(p => {
    cumulativeScores[p.id] = [];
  });

  roundHistory.forEach((round, idx) => {
    round.playerResults.forEach(result => {
      const prevScore = idx > 0 ? (cumulativeScores[result.playerId][idx - 1] || 0) : 0;
      cumulativeScores[result.playerId][idx] = prevScore + result.roundScore;
    });
  });

  // Get short display name (first 4 characters)
  const getShortName = (name: string) => name.slice(0, 4);

  return (
    <div className="border-t pt-1">
      <h4 className="font-medium text-[9px] text-muted-foreground mb-0.5">
        History
      </h4>
      <ScrollArea className="h-52 md:h-64">
        <table className="w-full text-[8px]">
          <thead>
            <tr className="border-b">
              <th className="text-left py-0.5 pr-0.5 w-6"></th>
              {players.map(p => (
                <th key={p.id} className="text-center py-0.5 px-0 font-medium w-[26px]" title={p.name}>
                  {getShortName(p.name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roundHistory.map((round, roundIdx) => {
              const config = roundConfigs[round.roundNumber - 1];
              return (
                <tr key={round.roundNumber} className="border-b border-muted/50">
                  <td className="py-0 pr-0.5">
                    <div className="flex items-center gap-0">
                      <span className="font-medium w-2 text-right text-[8px]">{config.cardCount}</span>
                      <TrumpIcon suit={config.trump} className="text-[10px]" />
                    </div>
                  </td>
                  {players.map(player => {
                    const result = round.playerResults.find(r => r.playerId === player.id);
                    if (!result) {
                      return (
                        <td key={player.id} className="text-center py-0">-</td>
                      );
                    }
                    const hit = result.tricksWon === result.call;
                    const missed = result.tricksWon !== result.call;
                    const cumulativeScore = cumulativeScores[player.id][roundIdx];

                    return (
                      <td
                        key={player.id}
                        className={cn(
                          "py-0 text-center",
                          hit && "bg-green-500/20",
                          missed && "bg-red-500/20"
                        )}
                      >
                        <span className={cn(
                          "tabular-nums",
                          hit && "text-green-600 dark:text-green-400 font-medium",
                          missed && "text-red-600 dark:text-red-400"
                        )}>
                          {result.call}/{cumulativeScore}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}

interface FinalScoreBoardProps {
  players: Player[];
  roundHistory: RoundResult[];
  onReturnToMenu?: () => void;
  onPlayAgain?: () => void;
}

export function FinalScoreBoard({ players, roundHistory, onReturnToMenu, onPlayAgain }: FinalScoreBoardProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  const cumulativeScores: Record<string, number[]> = {};
  sortedPlayers.forEach(p => {
    cumulativeScores[p.id] = [];
  });

  roundHistory.forEach((round, idx) => {
    round.playerResults.forEach(result => {
      const prevScore = idx > 0 ? (cumulativeScores[result.playerId][idx - 1] || 0) : 0;
      cumulativeScores[result.playerId][idx] = prevScore + result.roundScore;
    });
  });

  // Get short display name (first 4 characters)
  const getShortName = (name: string) => name.slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20">
          <Trophy className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Game Complete!</h2>
        <p className="text-muted-foreground text-sm">
          <span className="font-semibold text-foreground">{winner.name}</span> wins with{" "}
          <span className="font-bold text-primary">{winner.score}</span> points!
        </p>
      </div>

      <div className="space-y-2">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg",
              index === 0 ? "bg-primary text-primary-foreground" : "bg-card border"
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-6 h-6 flex items-center justify-center rounded-full font-bold text-sm",
                index === 0 ? "bg-primary-foreground/20" : "bg-muted"
              )}>
                {index + 1}
              </span>
              <span className="font-medium">{player.name}</span>
            </div>
            <span className="text-xl font-bold">{player.score}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm">Round History</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-64">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 pr-1 w-8"></th>
                  {sortedPlayers.map(p => (
                    <th key={p.id} className="text-center py-1 px-0.5 font-medium" title={p.name}>
                      {getShortName(p.name)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roundHistory.map((round, roundIdx) => {
                  const config = roundConfigs[round.roundNumber - 1];
                  return (
                    <tr key={round.roundNumber} className="border-b border-muted/50">
                      <td className="py-0.5 pr-1">
                        <div className="flex items-center gap-0.5">
                          <span className="font-medium w-3 text-right">{config.cardCount}</span>
                          <TrumpIcon suit={config.trump} className="text-xs" />
                        </div>
                      </td>
                      {sortedPlayers.map(player => {
                        const result = round.playerResults.find(r => r.playerId === player.id);
                        if (!result) {
                          return (
                            <td key={player.id} className="text-center py-0.5">-</td>
                          );
                        }
                        const hit = result.tricksWon === result.call;
                        const missed = result.tricksWon !== result.call;
                        const cumulativeScore = cumulativeScores[player.id][roundIdx];

                        return (
                          <td
                            key={player.id}
                            className={cn(
                              "py-0.5 text-center",
                              hit && "bg-green-500/20",
                              missed && "bg-red-500/20"
                            )}
                          >
                            <span className={cn(
                              "tabular-nums",
                              hit && "text-green-600 dark:text-green-400 font-medium",
                              missed && "text-red-600 dark:text-red-400"
                            )}>
                              {result.call}/{cumulativeScore}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="font-bold bg-muted/30">
                  <td className="py-1 pr-1 text-[9px]">Total</td>
                  {sortedPlayers.map(player => (
                    <td key={player.id} className="text-center py-1">
                      {player.score}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      {(onPlayAgain || onReturnToMenu) && (
        <div className="flex justify-center gap-3 pt-2">
          {onPlayAgain && (
            <Button
              onClick={onPlayAgain}
              size="lg"
              className="gap-2"
              data-testid="button-play-again"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </Button>
          )}
          {onReturnToMenu && (
            <Button
              onClick={onReturnToMenu}
              size="lg"
              variant={onPlayAgain ? "outline" : "default"}
              className="gap-2"
              data-testid="button-return-menu"
            >
              <Home className="w-4 h-4" />
              Main Menu
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
