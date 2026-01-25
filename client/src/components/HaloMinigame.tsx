import { HaloMinigameState, Player, Card } from "@shared/schema";
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayingCard } from "./PlayingCard";
import { ArrowUp, ArrowDown, Equal, Banknote, Star, CheckCircle } from "lucide-react";

interface HaloMinigameProps {
  haloState: HaloMinigameState;
  players: Player[];
  playerId: string;
  onGuess: (guess: "higher" | "lower" | "same") => void;
  onBank: () => void;
}

export function HaloMinigame({
  haloState,
  players,
  playerId,
  onGuess,
  onBank,
}: HaloMinigameProps) {
  const currentPlayer = players.find((p) => p.id === haloState.currentPlayerId);
  const isMyTurn = haloState.currentPlayerId === playerId;
  const potentialScore = haloState.correctGuesses ** 2;
  const maxScore = 49; // 7^2

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-purple-900/20 to-background">
      <UICard className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Star className="w-6 h-6 text-yellow-500" />
          </div>
          <CardTitle className="text-xl">HALO</CardTitle>
          <p className="text-sm text-muted-foreground">
            Higher, Lower, or Same? Score = Correct Guesses Squared!
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Player Info */}
          <div className="text-center">
            {haloState.isComplete ? (
              <Badge variant="secondary" className="text-lg px-4 py-1">
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete!
              </Badge>
            ) : (
              <Badge
                variant={isMyTurn ? "default" : "secondary"}
                className="text-lg px-4 py-1"
              >
                {isMyTurn ? "Your Turn!" : `${currentPlayer?.name}'s Turn`}
              </Badge>
            )}
          </div>

          {/* Current Card */}
          {haloState.currentCard && !haloState.isComplete && (
            <div className="flex flex-col items-center gap-4">
              <PlayingCard card={haloState.currentCard} size="lg" />

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Correct</p>
                  <p className="text-2xl font-bold text-green-500">
                    {haloState.correctGuesses}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Potential Score</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    {potentialScore}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Max</p>
                  <p className="text-2xl font-bold text-muted-foreground">
                    {maxScore}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {isMyTurn && !haloState.isComplete && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="flex flex-col gap-1 h-auto py-3"
                  onClick={() => onGuess("higher")}
                >
                  <ArrowUp className="w-5 h-5 text-green-500" />
                  <span>Higher</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col gap-1 h-auto py-3"
                  onClick={() => onGuess("same")}
                >
                  <Equal className="w-5 h-5 text-yellow-500" />
                  <span>Same</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col gap-1 h-auto py-3"
                  onClick={() => onGuess("lower")}
                >
                  <ArrowDown className="w-5 h-5 text-red-500" />
                  <span>Lower</span>
                </Button>
              </div>

              {haloState.correctGuesses > 0 && (
                <Button
                  className="w-full"
                  variant="default"
                  onClick={onBank}
                >
                  <Banknote className="w-4 h-4 mr-2" />
                  Bank {potentialScore} Points
                </Button>
              )}
            </div>
          )}

          {/* Results */}
          {haloState.playerResults.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Results</h4>
              <div className="space-y-1">
                {haloState.playerResults.map((result) => {
                  const player = players.find((p) => p.id === result.playerId);
                  return (
                    <div
                      key={result.playerId}
                      className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                    >
                      <span>{player?.name}</span>
                      <Badge variant={result.score > 0 ? "default" : "secondary"}>
                        +{result.score}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Waiting message for non-current players */}
          {!isMyTurn && !haloState.isComplete && (
            <p className="text-center text-sm text-muted-foreground animate-pulse">
              Waiting for {currentPlayer?.name} to play...
            </p>
          )}
        </CardContent>
      </UICard>
    </div>
  );
}
