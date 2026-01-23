import { useState, useMemo, useEffect, useRef } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { LobbyCreate, LobbyWaiting } from "@/components/Lobby";
import { DealerDetermination } from "@/components/DealerDetermination";
import { CallDialog } from "@/components/CallDialog";
import { TrickArea } from "@/components/TrickArea";
import { PlayerHand } from "@/components/PlayerHand";
import { ScoreBoard, FinalScoreBoard } from "@/components/ScoreBoard";
import { RoundEndDisplay } from "@/components/RoundEndDisplay";
import { Card, Suit, Player } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function Game() {
  const {
    gameState,
    playerId,
    gameId,
    isConnected,
    isConnecting,
    error,
    createGame,
    createSinglePlayerGame,
    joinGame,
    startGame,
    makeCall,
    playCard,
    nextRound,
  } = useWebSocket();

  const { toast } = useToast();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // Get current player
  const currentPlayer = useMemo(() => {
    if (!gameState || !playerId) return null;
    return gameState.players.find((p) => p.id === playerId);
  }, [gameState, playerId]);

  // Check if this player is host (first player)
  const isHost = useMemo(() => {
    if (!gameState || !playerId) return false;
    return gameState.players[0]?.id === playerId;
  }, [gameState, playerId]);

  // Check if it's this player's turn
  const isMyTurn = useMemo(() => {
    if (!gameState || !playerId) return false;
    const activePlayer = gameState.players[gameState.currentPlayerIndex];
    return activePlayer?.id === playerId;
  }, [gameState, playerId]);

  // Calculate playable cards based on lead suit and trump
  const playableCards = useMemo(() => {
    if (!currentPlayer || !isMyTurn || gameState?.phase !== "playing") return [];

    const hand = currentPlayer.hand;
    const leadSuit = gameState.currentTrick.leadSuit;

    if (!leadSuit) {
      // First card of trick - can play anything
      return hand;
    }

    // Must follow lead suit if possible
    const suitCards = hand.filter((c) => c.suit === leadSuit);
    if (suitCards.length > 0) {
      return suitCards;
    }

    // Can't follow suit - can play anything
    return hand;
  }, [currentPlayer, isMyTurn, gameState]);

  // Show error toast - using useEffect to avoid calling during render
  const lastErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error;
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Not in a game yet - show lobby
  if (!gameState) {
    return (
      <LobbyCreate
        onCreateGame={createGame}
        onCreateSinglePlayerGame={createSinglePlayerGame}
        onJoinGame={joinGame}
        isConnecting={isConnecting}
      />
    );
  }

  // Lobby phase - waiting for players
  if (gameState.phase === "lobby") {
    return (
      <LobbyWaiting
        gameId={gameState.id}
        players={gameState.players}
        isHost={isHost}
        onStartGame={startGame}
        isSinglePlayer={gameState.isSinglePlayer}
      />
    );
  }

  // Determining dealer phase
  if (gameState.phase === "determining_dealer") {
    return (
      <DealerDetermination
        dealerCards={gameState.dealerCards}
        players={gameState.players}
        dealerIndex={gameState.dealerIndex >= 0 ? gameState.dealerIndex : null}
      />
    );
  }

  // Round end phase
  if (gameState.phase === "round_end") {
    const lastRoundResult = gameState.roundHistory[gameState.roundHistory.length - 1];
    if (!lastRoundResult) return null;

    return (
      <RoundEndDisplay
        roundNumber={gameState.currentRound}
        roundResult={lastRoundResult}
        players={gameState.players}
        isHost={isHost}
        onNextRound={nextRound}
        isLastRound={gameState.currentRound >= 13}
        doublePoints={gameState.doublePoints}
      />
    );
  }

  // Game end phase
  if (gameState.phase === "game_end") {
    const handleReturnToMenu = () => {
      window.location.reload();
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-2xl">
          <FinalScoreBoard
            players={gameState.players}
            roundHistory={gameState.roundHistory}
            onReturnToMenu={handleReturnToMenu}
          />
        </div>
      </div>
    );
  }

  // Calling phase
  if (gameState.phase === "calling" && isMyTurn && currentPlayer) {
    const currentCalls = gameState.players
      .filter((p) => p.call !== null)
      .map((p) => ({ playerName: p.name, call: p.call! }));

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-lg space-y-6">
          <CallDialog
            cardCount={gameState.cardCount}
            currentCalls={currentCalls}
            isDealer={currentPlayer.isDealer}
            onMakeCall={makeCall}
            playerName={currentPlayer.name}
          />

          <div className="mt-6">
            <h3 className="text-sm font-medium text-muted-foreground text-center mb-3">
              Your Cards
            </h3>
            <div className="flex justify-center">
              <PlayerHand
                cards={currentPlayer.hand}
                isCurrentPlayer={false}
                playableCards={[]}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main game view (calling phase waiting or playing phase)
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Scoreboard */}
        <div className="lg:col-span-1">
          <ScoreBoard
            players={gameState.players}
            roundHistory={gameState.roundHistory}
            currentRound={gameState.currentRound}
            showFullHistory={true}
          />
        </div>

        {/* Main game area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Game status for calling phase waiting */}
          {gameState.phase === "calling" && !isMyTurn && (
            <div className="text-center p-4 bg-card rounded-lg">
              <p className="text-muted-foreground">
                Waiting for{" "}
                <span className="font-semibold text-foreground">
                  {gameState.players[gameState.currentPlayerIndex]?.name}
                </span>{" "}
                to make their call...
              </p>
              <div className="mt-2 text-sm text-muted-foreground">
                Calls so far:{" "}
                {gameState.players
                  .filter((p) => p.call !== null)
                  .map((p) => `${p.name}: ${p.call}`)
                  .join(", ") || "None yet"}
              </div>
            </div>
          )}

          {/* Trick area */}
          <TrickArea
            currentTrick={gameState.currentTrick}
            players={gameState.players}
            currentPlayerIndex={gameState.currentPlayerIndex}
            trump={gameState.trump}
            roundNumber={gameState.currentRound}
            cardCount={gameState.cardCount}
            doublePoints={gameState.doublePoints}
            trickNumber={gameState.trickNumber}
          />

          {/* Player's hand */}
          {currentPlayer && (
            <div className="mt-6">
              <div className="flex items-center justify-center gap-4 mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Your Hand ({currentPlayer.hand.length} cards)
                </h3>
                {currentPlayer.call !== null && (
                  <span className="text-sm text-muted-foreground">
                    Tricks: {currentPlayer.tricksWon} / {currentPlayer.call}
                  </span>
                )}
              </div>
              <div className="flex justify-center">
                <PlayerHand
                  cards={currentPlayer.hand}
                  onPlayCard={playCard}
                  selectedCard={selectedCard}
                  onSelectCard={setSelectedCard}
                  playableCards={playableCards}
                  isCurrentPlayer={isMyTurn && gameState.phase === "playing"}
                  leadSuit={gameState.currentTrick.leadSuit}
                />
              </div>

              {isMyTurn && gameState.phase === "playing" && (
                <p className="text-center text-sm text-primary mt-2 font-medium">
                  It's your turn to play a card!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
