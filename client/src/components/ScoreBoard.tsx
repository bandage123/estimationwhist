import { Player, RoundResult } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Crown, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScoreBoardProps {
  players: Player[];
  roundHistory: RoundResult[];
  currentRound: number;
  showFullHistory?: boolean;
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
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm text-muted-foreground mb-2">
              Round History
            </h4>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {roundHistory.map((round) => (
                  <div key={round.roundNumber} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Round {round.roundNumber}
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {round.playerResults.map((result) => (
                        <div
                          key={result.playerId}
                          className={cn(
                            "flex justify-between px-2 py-1 rounded",
                            result.tricksWon === result.call && "bg-green-500/10 text-green-600 dark:text-green-400"
                          )}
                        >
                          <span>{result.playerName}</span>
                          <span>
                            {result.tricksWon}/{result.call} (+{result.roundScore})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FinalScoreBoardProps {
  players: Player[];
  roundHistory: RoundResult[];
}

export function FinalScoreBoard({ players, roundHistory }: FinalScoreBoardProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Game Over!</h2>
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
                  <th className="text-left py-2">Round</th>
                  {sortedPlayers.map(p => (
                    <th key={p.id} className="text-center py-2">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roundHistory.map((round) => (
                  <tr key={round.roundNumber} className="border-b border-muted">
                    <td className="py-2 font-medium">R{round.roundNumber}</td>
                    {sortedPlayers.map(player => {
                      const result = round.playerResults.find(r => r.playerId === player.id);
                      if (!result) return <td key={player.id} className="text-center">-</td>;
                      const hit = result.tricksWon === result.call;
                      return (
                        <td 
                          key={player.id} 
                          className={cn(
                            "text-center py-2",
                            hit && "text-green-600 dark:text-green-400 font-medium"
                          )}
                        >
                          +{result.roundScore}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2">Total</td>
                  {sortedPlayers.map(player => (
                    <td key={player.id} className="text-center py-2">{player.score}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
