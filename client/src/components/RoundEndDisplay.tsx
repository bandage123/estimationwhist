import { Player, RoundResult } from "@shared/schema";
import { Button } from "@/components/ui/button";
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

  // Get display name
  const getDisplayName = (name: string) => name;

  const leader = [...players].sort((a, b) => b.score - a.score)[0];

  return (
    <div className="flex items-center justify-center p-2 bg-background">
      <div className="w-full max-w-md space-y-2">
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="text-xs">R{roundNumber}/13</Badge>
            {doublePoints && (
              <Badge variant="destructive" className="text-xs">2x</Badge>
            )}
          </div>
          <h2 className="text-lg font-bold">Round Complete</h2>
        </div>

        <div className="grid grid-cols-1 gap-1">
          {sortedResults.map((result) => {
            const hitTarget = result.tricksWon === result.call;
            const player = players.find(p => p.id === result.playerId);

            return (
              <div
                key={result.playerId}
                className={cn(
                  "flex items-center justify-between px-2 py-1 rounded text-sm",
                  hitTarget ? "bg-green-500/10" : "bg-muted/30"
                )}
              >
                <div className="flex items-center gap-2">
                  {hitTarget ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="font-medium truncate">{getDisplayName(result.playerName)}</span>
                  <span className="text-xs text-muted-foreground">
                    {result.call}→{result.tricksWon}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-bold",
                    hitTarget ? "text-green-500" : "text-muted-foreground"
                  )}>
                    +{result.roundScore}
                  </span>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {player?.score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-2 py-1.5 rounded bg-primary/10">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Leader:</span>
          </div>
          <span className="text-sm font-bold text-primary">
            {getDisplayName(leader?.name || "")} - {leader?.score} pts
          </span>
        </div>

        {isHost ? (
          <Button
            className="w-full"
            size="sm"
            onClick={onNextRound}
            data-testid="button-next-round"
          >
            {isLastRound ? "View Final Results" : `Round ${roundNumber + 1} →`}
          </Button>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Waiting for host...
          </p>
        )}
      </div>
    </div>
  );
}
