import { BrucieBonusState, Player } from "@shared/schema";
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayingCard } from "./PlayingCard";
import { ArrowUp, ArrowDown, Banknote, Zap, CheckCircle, SkipForward } from "lucide-react";

interface BrucieBonusProps {
  brucieState: BrucieBonusState;
  players: Player[];
  playerId: string;
  onGuess: (guess: "higher" | "lower") => void;
  onBank: () => void;
  onSkip: () => void;
}

export function BrucieBonus({
  brucieState,
  players,
  playerId,
  onGuess,
  onBank,
  onSkip,
}: BrucieBonusProps) {
  const currentPlayer = players.find((p) => p.id === brucieState.currentPlayerId);
  const isMyTurn = brucieState.currentPlayerId === playerId;

  // Calculate current multiplier: default 2x, +1 for each correct (max 3x)
  const currentMultiplier = Math.min(brucieState.correctGuesses + 2, 3);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-900/20 to-background">
      <UICard className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-green-500" />
          </div>
          <CardTitle className="text-xl">BRUCIE BONUS</CardTitle>
          <p className="text-sm text-muted-foreground">
            Higher or Lower? Boost your Round 13 multiplier!
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Player Info */}
          <div className="text-center">
            {brucieState.isComplete ? (
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
          {brucieState.currentCard && !brucieState.isComplete && (
            <div className="flex flex-col items-center gap-4">
              <PlayingCard card={brucieState.currentCard} size="lg" />

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Correct</p>
                  <p className="text-2xl font-bold text-green-500">
                    {brucieState.correctGuesses}/3
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Current Multiplier</p>
                  <p className="text-3xl font-bold text-yellow-500">
                    {currentMultiplier}x
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Skip = 2x | Play & Wrong = 1x | Bank = {currentMultiplier}x | Max = 3x
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {isMyTurn && !brucieState.isComplete && (
            <div className="space-y-3">
              {brucieState.correctGuesses === 0 ? (
                // First choice: Skip or Play
                <div className="space-y-2">
                  <p className="text-center text-sm font-medium">
                    Skip for guaranteed 2x, or play for higher?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="flex flex-col gap-1 h-auto py-3"
                      onClick={onSkip}
                    >
                      <SkipForward className="w-5 h-5 text-muted-foreground" />
                      <span>Skip (2x)</span>
                    </Button>
                    <div className="grid grid-cols-2 gap-1">
                      <Button
                        variant="outline"
                        className="flex flex-col gap-1 h-auto py-3"
                        onClick={() => onGuess("higher")}
                      >
                        <ArrowUp className="w-4 h-4 text-green-500" />
                        <span className="text-xs">Higher</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex flex-col gap-1 h-auto py-3"
                        onClick={() => onGuess("lower")}
                      >
                        <ArrowDown className="w-4 h-4 text-red-500" />
                        <span className="text-xs">Lower</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // Continue playing or bank
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
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
                      onClick={() => onGuess("lower")}
                    >
                      <ArrowDown className="w-5 h-5 text-red-500" />
                      <span>Lower</span>
                    </Button>
                  </div>

                  <Button
                    className="w-full"
                    variant="default"
                    onClick={onBank}
                  >
                    <Banknote className="w-4 h-4 mr-2" />
                    Bank {currentMultiplier}x Multiplier
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {brucieState.playerMultipliers.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Round 13 Multipliers</h4>
              <div className="space-y-1">
                {brucieState.playerMultipliers.map((result) => {
                  const player = players.find((p) => p.id === result.playerId);
                  return (
                    <div
                      key={result.playerId}
                      className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                    >
                      <span>{player?.name}</span>
                      <Badge
                        variant={
                          result.multiplier === 3
                            ? "default"
                            : result.multiplier === 1
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {result.multiplier}x
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Waiting message for non-current players */}
          {!isMyTurn && !brucieState.isComplete && (
            <p className="text-center text-sm text-muted-foreground animate-pulse">
              Waiting for {currentPlayer?.name} to play...
            </p>
          )}
        </CardContent>
      </UICard>
    </div>
  );
}
