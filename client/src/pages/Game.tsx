import { useState, useMemo, useEffect, useRef } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { LobbyCreate, LobbyWaiting } from "@/components/Lobby";
import { DealerDetermination } from "@/components/DealerDetermination";
import { CallDialog } from "@/components/CallDialog";
import { TrickArea } from "@/components/TrickArea";
import { PlayerHand } from "@/components/PlayerHand";
import { ScoreBoard, FinalScoreBoard } from "@/components/ScoreBoard";
import { RoundEndDisplay } from "@/components/RoundEndDisplay";
import { Card, Suit, Player, SpeedSetting } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Home, Trophy, Flag, ChevronRight, Crown, Gauge } from "lucide-react";

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
    startOlympicsQualifying,
    startOlympicsFinals,
    setSpeed,
  } = useWebSocket();

  const { toast } = useToast();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<SpeedSetting>(1);

  const handleSpeedChange = (speed: SpeedSetting) => {
    setCurrentSpeed(speed);
    setSpeed(speed);
  };

  const speedLabels: Record<SpeedSetting, string> = {
    0.25: "4x",
    0.5: "2x",
    1: "1x",
    2: "½x",
  };

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

  // Helper to convert country code to flag emoji
  const countryCodeToFlag = (code: string) => {
    if (!code || code.length !== 2) return '';
    const codePoints = code
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  // Get display name
  const getDisplayName = (name: string) => name;

  // Olympics draws phase - show table assignments before qualifying
  if (gameState.phase === "lobby" && gameState.isOlympics && gameState.olympicsState?.currentPhase === "draws") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-1.5 border-b flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleReturnToMenu} className="gap-1 h-7 text-xs">
            <Home className="w-3 h-3" />
            Menu
          </Button>
          <Badge variant="secondary" className="gap-1 bg-yellow-500/10 border-yellow-500/30 text-xs">
            <Trophy className="w-3 h-3 text-yellow-500" />
            The Draws
          </Badge>
        </div>
        <div className="flex-1 p-2">
          <div className="max-w-6xl mx-auto space-y-2">
            <div className="text-center">
              <h1 className="text-xl font-bold">Table Draws</h1>
              <p className="text-xs text-muted-foreground">49 countries in 7 tables - winners advance to finals</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1.5">
              {gameState.olympicsState.groups.map((group, groupIdx) => {
                const groupPlayers = group.playerIds.map(id =>
                  gameState.allOlympicsPlayers?.find(p => p.id === id)
                );
                const isHumanGroup = groupIdx === 0;

                return (
                  <div
                    key={group.groupNumber}
                    className={`rounded border p-1.5 ${isHumanGroup ? 'border-primary bg-primary/5' : 'bg-card'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">T{group.groupNumber}</span>
                      {isHumanGroup && <Badge variant="default" className="h-4 text-[9px] px-1">You</Badge>}
                    </div>
                    <div className="space-y-0.5">
                      {groupPlayers.map((player) => (
                        <div
                          key={player?.id}
                          className={`flex items-center gap-1 text-[10px] px-1 py-0.5 rounded ${
                            player && !player.isCPU ? 'bg-primary/20 font-medium' : ''
                          }`}
                        >
                          <span className="text-sm leading-none">{countryCodeToFlag(player?.countryCode || '')}</span>
                          <span className={player && !player.isCPU ? '' : 'text-muted-foreground'}>
                            {getDisplayName(player?.name || '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center pt-1">
              <Button size="sm" onClick={startOlympicsQualifying} className="gap-1" data-testid="button-start-qualifying">
                <Flag className="w-3 h-3" />
                Start Qualifying
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Olympics qualifying results phase
  if (gameState.phase === "game_end" && gameState.isOlympics && gameState.olympicsState?.currentPhase === "qualifying_results") {
    const olympics = gameState.olympicsState;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-1.5 border-b flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleReturnToMenu} className="gap-1 h-7 text-xs">
            <Home className="w-3 h-3" />
            Menu
          </Button>
          <Badge variant="secondary" className="gap-1 bg-yellow-500/10 border-yellow-500/30 text-xs">
            <Trophy className="w-3 h-3 text-yellow-500" />
            Results
          </Badge>
        </div>
        <div className="flex-1 p-2 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-2">
            <div className="text-center">
              <h1 className="text-lg font-bold">Qualifying Complete</h1>
              {olympics.humanQualified ? (
                <p className="text-sm text-green-500 font-medium">You advance to the Grand Final!</p>
              ) : (
                <p className="text-xs text-muted-foreground">You did not qualify - watch the Finals!</p>
              )}
            </div>

            {/* Match Reports - compact grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {olympics.groups.map((group) => {
                const winner = gameState.allOlympicsPlayers?.find(p => p.id === group.winnerId);
                const isHumanGroup = group.groupNumber === 1;

                return (
                  <div
                    key={group.groupNumber}
                    className={`p-2 rounded border text-xs ${isHumanGroup ? 'border-primary bg-primary/5' : 'bg-card'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-bold">T{group.groupNumber}</span>
                      <span className="text-sm">{countryCodeToFlag(winner?.countryCode || '')}</span>
                      <span className="font-medium">{getDisplayName(winner?.name || '')}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic line-clamp-2">
                      {group.matchReport}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Finalists */}
            <div className="p-2 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded">
              <h3 className="text-xs font-bold text-center mb-1.5">Grand Finalists</h3>
              <div className="flex flex-wrap justify-center gap-1">
                {olympics.finalsPlayerIds.map(id => {
                  const player = gameState.allOlympicsPlayers?.find(p => p.id === id);
                  const isHuman = id === playerId;
                  return (
                    <Badge
                      key={id}
                      variant={isHuman ? "default" : "secondary"}
                      className="gap-0.5 text-[10px] h-5"
                    >
                      <span className="text-xs">{countryCodeToFlag(player?.countryCode || '')}</span>
                      {getDisplayName(player?.name || '')}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-center">
              <Button size="sm" onClick={startOlympicsFinals} className="gap-1" data-testid="button-start-finals">
                <Trophy className="w-3 h-3 text-yellow-500" />
                {olympics.humanQualified ? "Play Final" : "Watch Final"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Lobby phase - waiting for players (non-Olympics or during finals)
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
    
    // Olympics tournament end screen - Champion celebration
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
            <div className="text-center max-w-2xl space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <Crown className="w-24 h-24 text-yellow-500 animate-pulse" />
                  <Trophy className="w-12 h-12 text-yellow-500 absolute -bottom-2 left-1/2 -translate-x-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-bold">The Whist World Cup Champion!</h1>
                <div className="flex items-center justify-center gap-3 text-2xl">
                  <span className="font-mono text-muted-foreground">{champion?.countryCode || "??"}</span>
                  <span className="font-semibold">{champion?.name || "Unknown"}</span>
                </div>
                <p className="text-sm text-muted-foreground">representing {champion?.countryName}</p>
              </div>
              
              {/* Champion Quote */}
              {olympics.championQuote && (
                <div className="p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-lg italic text-foreground">"{olympics.championQuote}"</p>
                  <p className="text-sm text-muted-foreground mt-2">- {champion?.name}, World Champion</p>
                </div>
              )}
              
              {/* Finals Match Report */}
              {olympics.finalsMatchReport && (
                <div className="p-4 bg-card rounded-lg border">
                  <h3 className="font-bold mb-2">Grand Final Report</h3>
                  <p className="text-sm text-muted-foreground italic">"{olympics.finalsMatchReport}"</p>
                </div>
              )}
              
              {isChampion ? (
                <p className="text-xl text-green-500 font-bold">
                  Congratulations! You are the World Champion!
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Better luck next time! {champion?.name} from {champion?.countryName} has claimed the crown.
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
    
    // Olympics in-progress end screen (qualifying or finals complete)
    if (isOlympics) {
      const isQualifying = olympics.currentPhase === "qualifying";
      const isFinals = olympics.currentPhase === "finals";
      
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
              {isQualifying ? "Qualifying Round - Table 1" : "Grand Final"}
            </Badge>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl space-y-6">
              <div className="text-center space-y-4">
                <h1 className="text-2xl font-bold">
                  {isQualifying ? "Qualifying Game Complete!" : "Grand Final Complete!"}
                </h1>
                <div className="flex items-center justify-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span>Winner: {winner?.name}</span>
                  <span className="font-mono text-sm text-muted-foreground">({winner?.countryCode})</span>
                </div>
                
                <div className={`p-4 rounded-lg ${humanWon ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  {humanWon ? (
                    <p className="text-green-500 font-semibold">
                      {isQualifying ? "You advance to the Grand Final!" : "You won the Grand Final!"}
                    </p>
                  ) : (
                    <p className="text-red-500">
                      {isQualifying ? "You did not advance to the Grand Final." : "You did not win the Grand Final."}
                    </p>
                  )}
                </div>
              </div>
              
              <FinalScoreBoard
                players={gameState.players}
                roundHistory={gameState.roundHistory}
              />
              
              <div className="flex justify-center">
                <Button 
                  onClick={nextOlympicsGame} 
                  size="lg" 
                  className="gap-2"
                  data-testid="button-next-olympics"
                >
                  {isQualifying ? (
                    <>View All Results <ChevronRight className="w-4 h-4" /></>
                  ) : isFinals ? (
                    <>Crown Champion <Crown className="w-4 h-4" /></>
                  ) : (
                    <>Continue <ChevronRight className="w-4 h-4" /></>
                  )}
                </Button>
              </div>
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
        <div className="flex items-center gap-4">
          {(gameState.isSinglePlayer || gameState.isOlympics) && (
            <div className="flex items-center gap-1">
              <Gauge className="w-3 h-3 text-muted-foreground" />
              <div className="flex gap-0.5">
                {([0.25, 0.5, 1, 2] as SpeedSetting[]).map((speed) => (
                  <Button
                    key={speed}
                    variant={currentSpeed === speed ? "default" : "ghost"}
                    size="sm"
                    className="h-6 px-1.5 text-xs"
                    onClick={() => handleSpeedChange(speed)}
                  >
                    {speedLabels[speed]}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            Round {gameState.currentRound}/13
          </div>
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left sidebar - Scoreboard (collapsed on mobile, visible on desktop) */}
        <div className="hidden md:block w-64 shrink-0 border-r overflow-y-auto p-1">
          <ScoreBoard
            players={gameState.players}
            roundHistory={gameState.roundHistory}
            currentRound={gameState.currentRound}
            showFullHistory={true}
          />
        </div>

        {/* Mobile compact scoreboard */}
        <div className="md:hidden border-b p-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2 justify-center text-xs">
            {gameState.players.map((p, i) => (
              <div
                key={p.id}
                className={`px-2 py-1 rounded ${
                  i === gameState.currentPlayerIndex ? 'bg-primary/20 font-medium' : 'bg-muted'
                } ${p.id === playerId ? 'ring-1 ring-primary' : ''}`}
              >
                <span className="font-medium">{p.name}</span>
                {p.countryCode && <span className="text-muted-foreground ml-1">({p.countryCode})</span>}
                <span className="ml-1">{p.score}pts</span>
                {p.call !== null && <span className="text-muted-foreground ml-1">({p.tricksWon}/{p.call})</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Main game area */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4">
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
                        {gameState.players[gameState.currentPlayerIndex]?.name || ""}
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
            <div className="space-y-2 md:space-y-4">
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
                <div className="mt-2 md:mt-6">
                  <div className="flex items-center justify-center gap-2 md:gap-4 mb-2 md:mb-3">
                    <h3 className="text-xs md:text-sm font-medium text-muted-foreground">
                      Your Hand ({currentPlayer.hand.length})
                    </h3>
                    {currentPlayer.call !== null && (
                      <span className="text-xs md:text-sm text-muted-foreground">
                        Tricks: {currentPlayer.tricksWon}/{currentPlayer.call}
                      </span>
                    )}
                    {isMyTurn && (
                      <span className="text-xs md:text-sm text-primary font-medium">
                        Your turn!
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
