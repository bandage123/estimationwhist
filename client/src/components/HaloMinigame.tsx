import { HaloMinigameState, Player, Card, MinigameGuessResult, getRankValue } from "@shared/schema";
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayingCard } from "./PlayingCard";
import { ArrowUp, ArrowDown, Equal, Banknote, Star, CheckCircle, ChevronRight, Trophy, X } from "lucide-react";

// Component to display the result of a guess
function ResultScreen({ result, onAcknowledge }: { result: MinigameGuessResult; onAcknowledge: () => void }) {
  const guessIcon = result.guess === "higher" ? (
    <ArrowUp className="w-5 h-5 text-green-500" />
  ) : result.guess === "lower" ? (
    <ArrowDown className="w-5 h-5 text-red-500" />
  ) : result.guess === "same" ? (
    <Equal className="w-5 h-5 text-yellow-500" />
  ) : (
    <Banknote className="w-5 h-5 text-blue-500" />
  );

  const guessText = result.guess === "higher" ? "Higher" : result.guess === "lower" ? "Lower" : result.guess === "same" ? "Same" : "Banked";

  // Determine what happened
  const isBanked = result.guess === "bank";
  const isCorrect = result.wasCorrect === true;
  const isBusted = result.wasCorrect === false;
  const isMaxed = isCorrect && result.correctGuesses >= 7;
  const stillPlaying = result.finalScore === null;

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
        {isBanked ? (
          <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <p className="text-lg font-bold text-blue-500">Banked!</p>
            <p className="text-2xl font-bold text-yellow-500">+{result.finalScore} points</p>
          </div>
        ) : isMaxed ? (
          <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-yellow-500">Perfect! 7 in a row!</p>
            <p className="text-2xl font-bold text-yellow-500">+49 points</p>
          </div>
        ) : isCorrect ? (
          <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-500">Correct!</p>
            <p className="text-sm text-muted-foreground">
              {result.correctGuesses} correct - potential score: {result.correctGuesses ** 2}
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
                : `${result.newCard!.rank} is the same as ${result.previousCard.rank}`}
            </p>
            <p className="text-lg font-bold text-red-500 mt-1">0 points</p>
          </div>
        ) : null}
      </div>

      {/* Continue button */}
      <Button className="w-full" onClick={onAcknowledge}>
        {stillPlaying ? "Continue" : result.finalScore !== null && result.finalScore > 0 ? "Next Player" : "Next Player"}
        <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

interface HaloMinigameProps {
  haloState: HaloMinigameState;
  players: Player[];
  playerId: string;
  onGuess: (guess: "higher" | "lower" | "same") => void;
  onBank: () => void;
  onContinue: () => void;
  onAcknowledge: () => void;
}

export function HaloMinigame({
  haloState,
  players,
  playerId,
  onGuess,
  onBank,
  onContinue,
  onAcknowledge,
}: HaloMinigameProps) {
  const currentPlayer = players.find((p) => p.id === haloState.currentPlayerId);
  const isMyTurn = haloState.currentPlayerId === playerId;
  const potentialScore = haloState.correctGuesses ** 2;
  const maxScore = 49; // 7^2

  // Get sorted results for final summary
  const sortedResults = [...haloState.playerResults].sort((a, b) => b.score - a.score);
  const totalHaloPoints = haloState.playerResults.reduce((sum, r) => sum + r.score, 0);

  // Check if showing result
  const showingResult = haloState.waitingForContinue && haloState.lastResult;

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
          {/* Showing Result of Last Action */}
          {showingResult && haloState.lastResult ? (
            <ResultScreen result={haloState.lastResult} onAcknowledge={onAcknowledge} />
          ) : haloState.isComplete ? (
            <div className="space-y-4">
              <div className="text-center">
                <Badge variant="secondary" className="text-lg px-4 py-1 bg-yellow-500/20 border-yellow-500/30">
                  <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
                  Halo Complete!
                </Badge>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <h4 className="text-sm font-medium text-center mb-3">Final Halo Scores</h4>
                {sortedResults.map((result, index) => {
                  const player = players.find((p) => p.id === result.playerId);
                  const isWinner = index === 0 && result.score > 0;
                  return (
                    <div
                      key={result.playerId}
                      className={`flex items-center justify-between text-sm p-2 rounded ${
                        isWinner ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isWinner && <Trophy className="w-4 h-4 text-yellow-500" />}
                        <span className={isWinner ? 'font-medium' : ''}>{player?.name}</span>
                      </div>
                      <Badge variant={result.score > 0 ? "default" : "secondary"}>
                        +{result.score}
                      </Badge>
                    </div>
                  );
                })}
              </div>

              <p className="text-center text-sm text-muted-foreground">
                These points will be added after Round 8
              </p>

              <Button className="w-full" onClick={onContinue}>
                Continue to Round 8
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
              {haloState.currentCard && (
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
              {isMyTurn && (
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

              {/* Results so far */}
              {haloState.playerResults.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Results So Far</h4>
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
