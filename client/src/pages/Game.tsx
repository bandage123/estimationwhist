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
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Home, Trophy, Flag, ChevronRight, Crown } from "lucide-react";

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
    createOlympicsGame,
    joinGame,
    startGame,
    makeCall,
    playCard,
    nextRound,
    nextOlympicsGame,
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

  const handleReturnToMenu = () => {
    window.location.reload();
  };

  // Not in a game yet - show lobby
  if (!gameState) {
    return (
      <LobbyCreate
        onCreateGame={createGame}
        onCreateSinglePlayerGame={createSinglePlayerGame}
        onCreateOlympicsGame={createOlympicsGame}
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
        isOlympics={gameState.isOlympics}
        olympicsGroupNumber={gameState.olympicsState?.currentGroupIndex !== undefined 
          ? gameState.olympicsState.currentGroupIndex + 1 
          : 1}
      />
    );
  }

  // Determining dealer phase
  if (gameState.phase === "determining_dealer") {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-2 border-b flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReturnToMenu}
            className="gap-2"
            data-testid="button-return-menu-top"
          >
            <Home className="w-4 h-4" />
            Main Menu
          </Button>
        </div>
        <DealerDetermination
          dealerCards={gameState.dealerCards}
          players={gameState.players}
          dealerIndex={gameState.dealerIndex >= 0 ? gameState.dealerIndex : null}
        />
      </div>
    );
  }

  // Round end phase
  if (gameState.phase === "round_end") {
    const lastRoundResult = gameState.roundHistory[gameState.roundHistory.length - 1];
    if (!lastRoundResult) return null;

    return (
      <div className="min-h-screen bg-background">
        <div className="p-2 border-b flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReturnToMenu}
            className="gap-2"
            data-testid="button-return-menu-top"
          >
            <Home className="w-4 h-4" />
            Main Menu
          </Button>
        </div>
        <div className="p-4">
          <RoundEndDisplay
            roundNumber={gameState.currentRound}
            roundResult={lastRoundResult}
            players={gameState.players}
            isHost={isHost}
            onNextRound={nextRound}
            isLastRound={gameState.currentRound >= 13}
            doublePoints={gameState.doublePoints}
          />
        </div>
      </div>
    );
  }

  // Game end phase
  if (gameState.phase === "game_end") {
    const olympics = gameState.olympicsState;
    const isOlympics = gameState.isOlympics && olympics;
    
    // Find winner of current game
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];
    const humanPlayerInGame = gameState.players.find(p => p.id === playerId);
    const humanWon = winner?.id === playerId;
    
    // Olympics tournament end screen
    if (isOlympics && olympics.currentPhase === "complete") {
      const champion = gameState.allOlympicsPlayers?.find(p => p.id === olympics.grandChampionId);
      const isChampion = olympics.grandChampionId === playerId;
      
      return (
        <div className="min-h-screen bg-background flex flex-col">
          <div className="p-2 border-b flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReturnToMenu}
              className="gap-2"
              data-testid="button-return-menu-top"
            >
              <Home className="w-4 h-4" />
              Main Menu
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-lg space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <Crown className="w-24 h-24 text-yellow-500" />
                  <Trophy className="w-12 h-12 text-yellow-500 absolute -bottom-2 left-1/2 -translate-x-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-bold">The Whist Olympics Champion!</h1>
                <div className="flex items-center justify-center gap-3 text-2xl">
                  <span className="font-mono">{champion?.countryCode || "??"}</span>
                  <span className="font-semibold">{champion?.name || "Unknown"}</span>
                </div>
              </div>
              {isChampion ? (
                <p className="text-xl text-green-500 font-semibold">
                  Congratulations! You are the World Champion!
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Better luck next time!
                </p>
              )}
              <Button onClick={handleReturnToMenu} size="lg" data-testid="button-olympics-finish">
                Return to Main Menu
              </Button>
            </div>
          </div>
        </div>
      );
    }
    
    // Olympics in-progress end screen (group or finals complete)
    if (isOlympics) {
      const isGroupStage = olympics.currentPhase === "groups";
      const currentGroupNum = olympics.currentGroupIndex + 1;
      const humanInCurrentGroup = olympics.currentGroupIndex === 0 || olympics.currentPhase === "finals";
      const advancesToFinals = humanInCurrentGroup && humanWon;
      
      return (
        <div className="min-h-screen bg-background flex flex-col">
          <div className="p-2 border-b flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReturnToMenu}
              className="gap-2"
              data-testid="button-return-menu-top"
            >
              <Home className="w-4 h-4" />
              Main Menu
            </Button>
            <Badge variant="secondary" className="gap-1">
              <Trophy className="w-3 h-3 text-yellow-500" />
              {isGroupStage ? `Group ${currentGroupNum}/7` : "Finals"}
            </Badge>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl space-y-6">
              <div className="text-center space-y-4">
                <h1 className="text-2xl font-bold">
                  {isGroupStage ? `Group ${currentGroupNum} Complete` : "Finals Complete"}
                </h1>
                <div className="flex items-center justify-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span>Winner: {winner?.name}</span>
                  <span className="font-mono text-sm text-muted-foreground">({winner?.countryCode})</span>
                </div>
                
                {humanInCurrentGroup && (
                  <div className={`p-4 rounded-lg ${humanWon ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    {humanWon ? (
                      <p className="text-green-500 font-semibold">
                        {isGroupStage ? "You advance to the Finals!" : "You won the Finals!"}
                      </p>
                    ) : (
                      <p className="text-red-500">
                        {isGroupStage ? "You did not advance to the Finals." : "You did not win the Finals."}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Tournament progress */}
                <div className="grid grid-cols-7 gap-1 mt-6">
                  {olympics.groups.map((group, idx) => (
                    <div
                      key={group.groupNumber}
                      className={`p-2 rounded text-xs text-center ${
                        group.completed 
                          ? 'bg-green-500/20 text-green-500' 
                          : idx === olympics.currentGroupIndex
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      G{group.groupNumber}
                      {group.completed && <span className="block">Done</span>}
                    </div>
                  ))}
                </div>
              </div>
              
              <FinalScoreBoard
                players={gameState.players}
                roundHistory={gameState.roundHistory}
              />
              
              {isHost && (
                <div className="flex justify-center">
                  <Button 
                    onClick={nextOlympicsGame} 
                    size="lg" 
                    className="gap-2"
                    data-testid="button-next-olympics"
                  >
                    {isGroupStage && olympics.currentGroupIndex < 6 ? (
                      <>Next Group <ChevronRight className="w-4 h-4" /></>
                    ) : isGroupStage ? (
                      <>Start Finals <Trophy className="w-4 h-4 text-yellow-500" /></>
                    ) : (
                      <>Crown Champion <Crown className="w-4 h-4" /></>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    // Regular game end
    return (
      <div className="min-h-screen bg-background">
        <div className="p-2 border-b flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReturnToMenu}
            className="gap-2"
            data-testid="button-return-menu-top"
          >
            <Home className="w-4 h-4" />
            Main Menu
          </Button>
        </div>
        <div className="flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <FinalScoreBoard
              players={gameState.players}
              roundHistory={gameState.roundHistory}
              onReturnToMenu={handleReturnToMenu}
            />
          </div>
        </div>
      </div>
    );
  }

  // Main game layout for calling and playing phases
  // Always show scoreboard on left, gameplay on right
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar with return to menu */}
      <div className="p-2 border-b flex items-center justify-between shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReturnToMenu}
          className="gap-2"
          data-testid="button-return-menu-top"
        >
          <Home className="w-4 h-4" />
          Main Menu
        </Button>
        <div className="text-sm text-muted-foreground">
          Round {gameState.currentRound}/13
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Scoreboard (always visible) */}
        <div className="w-64 shrink-0 border-r overflow-y-auto p-2">
          <ScoreBoard
            players={gameState.players}
            roundHistory={gameState.roundHistory}
            currentRound={gameState.currentRound}
            showFullHistory={true}
          />
        </div>

        {/* Main game area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Calling phase - show dialog or waiting message */}
          {gameState.phase === "calling" && (
            <>
              {isMyTurn && currentPlayer ? (
                <div className="max-w-lg mx-auto space-y-6">
                  <CallDialog
                    cardCount={gameState.cardCount}
                    currentCalls={gameState.players
                      .filter((p) => p.call !== null)
                      .map((p) => ({ playerName: p.name, call: p.call! }))}
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
              ) : (
                <div className="space-y-4">
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

                  {currentPlayer && (
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
                  )}
                </div>
              )}
            </>
          )}

          {/* Playing phase */}
          {gameState.phase === "playing" && (
            <div className="space-y-4">
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
                      isCurrentPlayer={isMyTurn}
                      leadSuit={gameState.currentTrick.leadSuit}
                    />
                  </div>

                  {isMyTurn && (
                    <p className="text-center text-sm text-primary mt-2 font-medium">
                      It's your turn to play a card!
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
