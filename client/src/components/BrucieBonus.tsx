import { BrucieBonusState, Player, MinigameGuessResult, getRankValue } from "@shared/schema";
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayingCard } from "./PlayingCard";
import { ArrowUp, ArrowDown, Banknote, Zap, SkipForward, ChevronRight, Trophy, CheckCircle, X } from "lucide-react";

// Component to display the result of a guess
function BrucieResultScreen({ result, onAcknowledge }: { result: MinigameGuessResult; onAcknowledge: () => void }) {
  const guessIcon = result.guess === "higher" ? (
    <ArrowUp className="w-5 h-5 text-green-500" />
  ) : result.guess === "lower" ? (
    <ArrowDown className="w-5 h-5 text-red-500" />
  ) : result.guess === "bank" ? (
    <Banknote className="w-5 h-5 text-blue-500" />
  ) : (
    <SkipForward className="w-5 h-5 text-muted-foreground" />
  );

  const guessText = result.guess === "higher" ? "Higher" : result.guess === "lower" ? "Lower" : result.guess === "bank" ? "Banked" : "Skipped";

  // Determine what happened
  const isBanked = result.guess === "bank";
  const isSkipped = result.guess === "skip";
  const isCorrect = result.wasCorrect === true;
  const isBusted = result.wasCorrect === false;
  const isMaxed = isCorrect && result.correctGuesses >= 3;
  const stillPlaying = result.finalScore === null;

  // Calculate current multiplier for display
  const multiplier = result.finalScore || (result.correctGuesses + 2);

  return (
    <div className="space-y-4">
      {/* Player name */}
      <div className="text-center">
        <Badge variant="secondary" className="text-lg px-4 py-1">
          {result.playerName}
        </Badge>
      </div>

      {/* Cards display */}
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Was showing</p>
          <PlayingCard card={result.previousCard} size="md" />
        </div>
        {result.newCard && (
          <>
            <div className="flex flex-col items-center gap-1">
              {guessIcon}
              <span className="text-xs text-muted-foreground">{guessText}</span>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Drew</p>
              <PlayingCard card={result.newCard} size="md" />
            </div>
          </>
        )}
      </div>

      {/* Result message */}
      <div className="text-center space-y-2">
        {isSkipped ? (
          <div className="p-3 bg-muted/50 border border-muted rounded-lg">
            <p className="text-lg font-bold">Skipped</p>
            <p className="text-2xl font-bold text-yellow-500">2x multiplier</p>
          </div>
        ) : isBanked ? (
          <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <p className="text-lg font-bold text-blue-500">Banked!</p>
            <p className="text-2xl font-bold text-yellow-500">{result.finalScore}x multiplier</p>
          </div>
        ) : isMaxed ? (
          <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
            <Trophy className="w-8 h-8 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-500">Perfect! 3 in a row!</p>
            <p className="text-2xl font-bold text-yellow-500">3x multiplier</p>
          </div>
        ) : isCorrect ? (
          <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-500">Correct!</p>
            <p className="text-sm text-muted-foreground">
              {result.correctGuesses}/3 correct - current: {Math.min(result.correctGuesses + 2, 3)}x
            </p>
          </div>
        ) : isBusted ? (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <X className="w-8 h-8 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-500">Wrong!</p>
            <p className="text-sm text-muted-foreground">
              {getRankValue(result.newCard!.rank) > getRankValue(result.previousCard.rank)
                ? `${result.newCard!.rank} is higher than ${result.previousCard.rank}`
                : getRankValue(result.newCard!.rank) < getRankValue(result.previousCard.rank)
                ? `${result.newCard!.rank} is lower than ${result.previousCard.rank}`
                : `${result.newCard!.rank} equals ${result.previousCard.rank}`}
            </p>
            <p className="text-lg font-bold text-red-500 mt-1">1x multiplier</p>
          </div>
        ) : null}
      </div>

      {/* Continue button */}
      <Button className="w-full" onClick={onAcknowledge}>
        {stillPlaying ? "Continue" : "Next Player"}
        <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

interface BrucieBonusProps {
  brucieState: BrucieBonusState;
  players: Player[];
  playerId: string;
  onGuess: (guess: "higher" | "lower") => void;
  onBank: () => void;
  onSkip: () => void;
  onContinue: () => void;
  onAcknowledge: () => void;
}

export function BrucieBonus({
  brucieState,
  players,
  playerId,
  onGuess,
  onBank,
  onSkip,
  onContinue,
  onAcknowledge,
}: BrucieBonusProps) {
  const currentPlayer = players.find((p) => p.id === brucieState.currentPlayerId);
  const isMyTurn = brucieState.currentPlayerId === playerId;

  // Calculate current multiplier: default 2x, +1 for each correct (max 3x)
  const currentMultiplier = Math.min(brucieState.correctGuesses + 2, 3);

  // Get sorted multipliers for final summary (highest first)
  const sortedMultipliers = [...brucieState.playerMultipliers].sort((a, b) => b.multiplier - a.multiplier);

  // Check if showing result
  const showingResult = brucieState.waitingForContinue && brucieState.lastResult;

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
          {/* Showing Result of Last Action */}
          {showingResult && brucieState.lastResult ? (
            <BrucieResultScreen result={brucieState.lastResult} onAcknowledge={onAcknowledge} />
          ) : brucieState.isComplete ? (
            <div className="space-y-4">
              <div className="text-center">
                <Badge variant="secondary" className="text-lg px-4 py-1 bg-green-500/20 border-green-500/30">
                  <Trophy className="w-4 h-4 mr-2 text-green-500" />
                  Brucie Bonus Complete!
                </Badge>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <h4 className="text-sm font-medium text-center mb-3">Final Round 13 Multipliers</h4>
                {sortedMultipliers.map((result) => {
                  const player = players.find((p) => p.id === result.playerId);
                  const isMax = result.multiplier === 3;
                  return (
                    <div
                      key={result.playerId}
                      className={`flex items-center justify-between text-sm p-2 rounded ${
                        isMax ? 'bg-green-500/20 border border-green-500/30' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isMax && <Trophy className="w-4 h-4 text-green-500" />}
                        <span className={isMax ? 'font-medium' : ''}>{player?.name}</span>
                      </div>
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

              <p className="text-center text-sm text-muted-foreground">
                These multipliers will be applied to Round 13 scores
              </p>

              <Button className="w-full" onClick={onContinue}>
                Continue to Final Round
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <>
              {/* Current Player Info */}
              <div className="text-center">
                <Badge
                  variant={isMyTurn ? "default" : "secondary"}
                  className="text-lg px-4 py-1"
                >
                  {isMyTurn ? "Your Turn!" : `${currentPlayer?.name}'s Turn`}
                </Badge>
              </div>

              {/* Current Card */}
              {brucieState.currentCard && (
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
              {isMyTurn && (
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

              {/* Results so far */}
              {brucieState.playerMultipliers.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Multipliers So Far</h4>
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
              {!isMyTurn && (
                <p className="text-center text-sm text-muted-foreground animate-pulse">
                  Waiting for {currentPlayer?.name} to play...
                </p>
              )}
            </>
          )}
        </CardContent>
      </UICard>
    </div>
  );
}
