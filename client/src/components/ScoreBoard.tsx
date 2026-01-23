import { Player, RoundResult, roundConfigs, Suit } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trophy, Crown, Target, X, Home } from "lucide-react";
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
  const leader = sortedPlayers[0];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5 text-primary" />
          Scoreboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              data-testid={`scoreboard-player-${player.name}`}
              className={cn(
                "flex items-center justify-between p-2 rounded-md",
                index === 0 && "bg-primary/10",
                player.isDealer && "ring-1 ring-primary/50"
              )}
            >
              <div className="flex items-center gap-2">
                {index === 0 && player.score > 0 && (
                  <Crown className="w-4 h-4 text-primary" />
                )}
                <span className="font-medium">{player.name}</span>
                {player.isDealer && (
                  <Badge variant="outline" className="text-xs">
                    Dealer
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                {player.call !== null && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Target className="w-3 h-3" />
                    <span>{player.tricksWon}/{player.call}</span>
                  </div>
                )}
                <span className="font-bold text-lg tabular-nums" data-testid={`score-${player.name}`}>
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

  return (
    <div className="border-t pt-4">
      <h4 className="font-medium text-sm text-muted-foreground mb-2">
        Round History
      </h4>
      <ScrollArea className="h-48">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-2 w-12"></th>
              {players.map(p => (
                <th key={p.id} colSpan={2} className="text-center py-2 px-1 font-medium">
                  {p.name}
                </th>
              ))}
            </tr>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-1 pr-2"></th>
              {players.map(p => (
                <th key={p.id} colSpan={2} className="py-1">
                  <div className="flex justify-center gap-1">
                    <span className="w-8 text-center">Call</span>
                    <span className="border-l border-dotted border-muted-foreground/50"></span>
                    <span className="w-8 text-center">Pts</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roundHistory.map((round, roundIdx) => {
              const config = roundConfigs[round.roundNumber - 1];
              return (
                <tr key={round.roundNumber} className="border-b border-muted/50">
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-1">
                      <span className="font-medium w-4 text-right">{config.cardCount}</span>
                      <TrumpIcon suit={config.trump} />
                    </div>
                  </td>
                  {players.map(player => {
                    const result = round.playerResults.find(r => r.playerId === player.id);
                    if (!result) {
                      return (
                        <td key={player.id} colSpan={2} className="text-center py-1.5">-</td>
                      );
                    }
                    const hit = result.tricksWon === result.call;
                    const missed = result.tricksWon !== result.call;
                    const cumulativeScore = cumulativeScores[player.id][roundIdx];
                    
                    return (
                      <td 
                        key={player.id} 
                        colSpan={2}
                        className={cn(
                          "py-1.5",
                          hit && "bg-green-500/20",
                          missed && "bg-red-500/20"
                        )}
                      >
                        <div className="flex justify-center gap-1">
                          <span className={cn(
                            "w-8 text-center tabular-nums",
                            hit && "text-green-600 dark:text-green-400 font-medium",
                            missed && "text-red-600 dark:text-red-400"
                          )}>
                            {result.call}
                          </span>
                          <span className="border-l border-dotted border-muted-foreground/30"></span>
                          <span className={cn(
                            "w-8 text-center tabular-nums",
                            hit && "text-green-600 dark:text-green-400 font-medium",
                            missed && "text-red-600 dark:text-red-400"
                          )}>
                            {cumulativeScore}
                          </span>
                        </div>
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
}

export function FinalScoreBoard({ players, roundHistory, onReturnToMenu }: FinalScoreBoardProps) {
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

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Game Complete!</h2>
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">{winner.name}</span> wins with{" "}
          <span className="font-bold text-primary">{winner.score}</span> points!
        </p>
      </div>

      <div className="space-y-3">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={cn(
              "flex items-center justify-between p-4 rounded-lg",
              index === 0 ? "bg-primary text-primary-foreground" : "bg-card border"
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full font-bold",
                index === 0 ? "bg-primary-foreground/20" : "bg-muted"
              )}>
                {index + 1}
              </span>
              <span className="font-medium text-lg">{player.name}</span>
            </div>
            <span className="text-2xl font-bold">{player.score}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Complete Round History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-3 w-16"></th>
                  {sortedPlayers.map(p => (
                    <th key={p.id} colSpan={2} className="text-center py-2 px-1 font-medium">
                      {p.name}
                    </th>
                  ))}
                </tr>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left py-1 pr-3"></th>
                  {sortedPlayers.map(p => (
                    <th key={p.id} colSpan={2} className="py-1">
                      <div className="flex justify-center gap-2">
                        <span className="w-8 text-center">Call</span>
                        <span className="border-l border-dotted border-muted-foreground/50"></span>
                        <span className="w-8 text-center">Pts</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roundHistory.map((round, roundIdx) => {
                  const config = roundConfigs[round.roundNumber - 1];
                  return (
                    <tr key={round.roundNumber} className="border-b border-muted/50">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium w-5 text-right">{config.cardCount}</span>
                          <TrumpIcon suit={config.trump} />
                        </div>
                      </td>
                      {sortedPlayers.map(player => {
                        const result = round.playerResults.find(r => r.playerId === player.id);
                        if (!result) {
                          return (
                            <td key={player.id} colSpan={2} className="text-center py-2">-</td>
                          );
                        }
                        const hit = result.tricksWon === result.call;
                        const missed = result.tricksWon !== result.call;
                        const cumulativeScore = cumulativeScores[player.id][roundIdx];
                        
                        return (
                          <td 
                            key={player.id} 
                            colSpan={2}
                            className={cn(
                              "py-2",
                              hit && "bg-green-500/20",
                              missed && "bg-red-500/20"
                            )}
                          >
                            <div className="flex justify-center gap-2">
                              <span className={cn(
                                "w-8 text-center tabular-nums",
                                hit && "text-green-600 dark:text-green-400 font-medium",
                                missed && "text-red-600 dark:text-red-400"
                              )}>
                                {result.call}
                              </span>
                              <span className="border-l border-dotted border-muted-foreground/30"></span>
                              <span className={cn(
                                "w-8 text-center tabular-nums",
                                hit && "text-green-600 dark:text-green-400 font-medium",
                                missed && "text-red-600 dark:text-red-400"
                              )}>
                                {cumulativeScore}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="font-bold bg-muted/30">
                  <td className="py-2 pr-3">Total</td>
                  {sortedPlayers.map(player => (
                    <td key={player.id} colSpan={2} className="text-center py-2">
                      {player.score}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      {onReturnToMenu && (
        <div className="flex justify-center pt-2">
          <Button 
            onClick={onReturnToMenu}
            size="lg"
            className="gap-2"
            data-testid="button-return-menu"
          >
            <Home className="w-4 h-4" />
            Return to Main Menu
          </Button>
        </div>
      )}
    </div>
  );
}
