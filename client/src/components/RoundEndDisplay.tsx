import { Player, RoundResult } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoundEndDisplayProps {
  roundNumber: number;
  roundResult: RoundResult;
  players: Player[];
  isHost: boolean;
  onNextRound: () => void;
  isLastRound: boolean;
  doublePoints: boolean;
}

export function RoundEndDisplay({
  roundNumber,
  roundResult,
  players,
  isHost,
  onNextRound,
  isLastRound,
  doublePoints,
}: RoundEndDisplayProps) {
  const sortedResults = [...roundResult.playerResults].sort(
    (a, b) => b.roundScore - a.roundScore
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="secondary">Round {roundNumber}/13</Badge>
            {doublePoints && (
              <Badge variant="destructive">2x Points!</Badge>
            )}
          </div>
          <CardTitle className="text-2xl font-serif">Round Complete!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {sortedResults.map((result, index) => {
              const hitTarget = result.tricksWon === result.call;
              const player = players.find(p => p.id === result.playerId);

              return (
                <div
                  key={result.playerId}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg",
                    hitTarget ? "bg-green-500/10 border border-green-500/30" : "bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {hitTarget ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{result.playerName}</p>
                      <p className="text-sm text-muted-foreground">
                        Called {result.call}, won {result.tricksWon}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-xl font-bold",
                      hitTarget ? "text-green-500" : "text-muted-foreground"
                    )}>
                      +{result.roundScore}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total: {player?.score}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10">
            <Trophy className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Current Leader</p>
              <p className="text-lg font-bold text-primary">
                {[...players].sort((a, b) => b.score - a.score)[0]?.name} -{" "}
                {[...players].sort((a, b) => b.score - a.score)[0]?.score} pts
              </p>
            </div>
          </div>

          {isHost ? (
            <Button
              className="w-full"
              size="lg"
              onClick={onNextRound}
              data-testid="button-next-round"
            >
              {isLastRound ? "View Final Results" : `Continue to Round ${roundNumber + 1}`}
            </Button>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Waiting for the host to continue...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
