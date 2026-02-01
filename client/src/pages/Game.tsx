import { useState, useMemo, useEffect, useRef } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { LobbyCreate, LobbyWaiting } from "@/components/Lobby";
import { DealerDetermination } from "@/components/DealerDetermination";
import { CallDialog } from "@/components/CallDialog";
import { TrickArea } from "@/components/TrickArea";
import { PlayerHand } from "@/components/PlayerHand";
import { PlayingCard } from "@/components/PlayingCard";
import { ScoreBoard, FinalScoreBoard } from "@/components/ScoreBoard";
import { RoundEndDisplay } from "@/components/RoundEndDisplay";
import { KellerStatusBar } from "@/components/KellerStatusBar";
import { HaloMinigame } from "@/components/HaloMinigame";
import { BrucieBonus } from "@/components/BrucieBonus";
import { RulesDialog } from "@/components/RulesDialog";
import { ChatPanel } from "@/components/ChatPanel";
import { TableLayout } from "@/components/table";
import { Card, Suit, Player, SpeedSetting, GameFormat } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Home, Trophy, Flag, ChevronRight, Crown, Gauge, Sparkles, EyeOff, Shuffle, ArrowRight, Check, Save, UserX, Users, Bot, RotateCcw } from "lucide-react";
import { saveHighScore } from "@/lib/highScores";
import { logGameStart, logGameCompletion } from "@/lib/analytics";
import { saveGame, autoSaveGame, clearAutoSave } from "@/lib/savedGames";

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
    // Keller format actions
    startBlindRounds,
    startBlindRoundsNow,
    declineBlindRoundOne,
    useSwap,
    haloGuess,
    haloBank,
    haloContinue,
    brucieGuess,
    brucieBank,
    skipBrucie,
    brucieContinue,
    restoreSavedGame,
    minigameAcknowledge,
    requestState,
    requestSaveState,
    // Disconnection handling
    disconnectionNotification,
    cpuReplacementVote,
    clearDisconnectionNotification,
    voteCpuReplacement,
    // Chat
    chatMessages,
    unreadChatCount,
    sendChat,
    clearUnreadChat,
    // Provisionals
    provisionalSuggestions,
    suggestProvisional,
    voteProvisional,
  } = useWebSocket();

  const { toast } = useToast();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<SpeedSetting>(1);
  const [swapMode, setSwapMode] = useState(false);
  const [cardToSwap, setCardToSwap] = useState<Card | null>(null); // Card selected for swap, awaiting confirmation
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Track game settings for "Play Again"
  const lastGameSettingsRef = useRef<{
    playerName: string;
    gameFormat: GameFormat;
    isSinglePlayer: boolean;
    cpuCount: number;
    isOlympics: boolean;
    countryCode?: string;
  } | null>(null);

  // Track notification permission
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);

  const handleSaveGame = () => {
    if (!gameState || !playerId) return;
    try {
      setSaveStatus("saving");
      // Request full unmasked state from server so CPU hands are preserved
      requestSaveState((fullState) => {
        try {
          saveGame(fullState, playerId);
          setSaveStatus("saved");
          toast({
            title: "Game Saved",
            description: "You can continue from the main menu.",
          });
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch (e) {
          toast({
            title: "Save Failed",
            description: "Could not save the game.",
            variant: "destructive",
          });
          setSaveStatus("idle");
        }
      });
    } catch (e) {
      toast({
        title: "Save Failed",
        description: "Could not save the game.",
        variant: "destructive",
      });
      setSaveStatus("idle");
    }
  };
  const [handBeforeSwap, setHandBeforeSwap] = useState<Card[] | null>(null); // Track hand to detect new card
  const [newSwappedCard, setNewSwappedCard] = useState<Card | null>(null); // The card received from swap

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

  // Get opponents (all players except current player) for table layout
  const opponents = useMemo(() => {
    if (!gameState || !playerId) return [];
    return gameState.players.filter(p => p.id !== playerId);
  }, [gameState, playerId]);

  // Track last trick winner for emotional reactions
  const [lastTrickWinnerId, setLastTrickWinnerId] = useState<string | null>(null);
  const prevTrickNumberRef = useRef<number>(0);

  useEffect(() => {
    if (!gameState || !gameState.currentTrick) return;
    // When trick number increases, the previous trick was won
    if (gameState.trickNumber > prevTrickNumberRef.current && gameState.currentTrick.winnerId) {
      setLastTrickWinnerId(gameState.currentTrick.winnerId);
      // Clear after 3 seconds
      const timeout = setTimeout(() => setLastTrickWinnerId(null), 3000);
      return () => clearTimeout(timeout);
    }
    // When trick resets to 1 (new round), reset
    if (gameState.trickNumber < prevTrickNumberRef.current) {
      setLastTrickWinnerId(null);
    }
    prevTrickNumberRef.current = gameState.trickNumber;
  }, [gameState?.trickNumber, gameState?.currentTrick?.winnerId]);

  // Get Keller player state
  const kellerState = useMemo(() => {
    if (!gameState || !playerId || gameState.gameFormat !== "keller") return undefined;
    return gameState.kellerPlayerStates?.[playerId];
  }, [gameState, playerId]);

  // Check if we need to show the round 1 blind choice prompt
  const needsRoundOneBlindChoice = useMemo(() => {
    if (!gameState || !kellerState) return false;
    return (
      gameState.gameFormat === "keller" &&
      gameState.currentRound === 1 &&
      gameState.phase === "calling" &&
      !kellerState.madeRoundOneBlindChoice
    );
  }, [gameState, kellerState]);

  // Handle swap card selection - just selects the card for confirmation
  const handleSwapCard = (card: Card) => {
    if (swapMode && card) {
      setCardToSwap(card);
    }
  };

  // Confirm the swap
  const confirmSwap = () => {
    if (cardToSwap && currentPlayer) {
      // Store the current hand to detect the new card later
      setHandBeforeSwap([...currentPlayer.hand]);
      useSwap(cardToSwap);
      setCardToSwap(null);
      setSwapMode(false);
    }
  };

  // Cancel the swap selection
  const cancelSwap = () => {
    setCardToSwap(null);
  };

  // Dismiss the swap result display
  const dismissSwapResult = () => {
    setNewSwappedCard(null);
    setHandBeforeSwap(null);
  };

  // Detect the new card after swap completes
  useEffect(() => {
    if (handBeforeSwap && currentPlayer && kellerState?.swapUsed) {
      // Find the card that's in the current hand but wasn't in the hand before swap
      const newCard = currentPlayer.hand.find(card =>
        !handBeforeSwap.some(oldCard =>
          oldCard.suit === card.suit && oldCard.rank === card.rank
        )
      );
      if (newCard) {
        setNewSwappedCard(newCard);
        setHandBeforeSwap(null);
      }
    }
  }, [currentPlayer?.hand, handBeforeSwap, kellerState?.swapUsed]);

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

  // Show disconnection notifications
  useEffect(() => {
    if (disconnectionNotification) {
      if (disconnectionNotification.type === 'disconnected') {
        toast({
          title: "Player Disconnected",
          description: `${disconnectionNotification.playerName} has been disconnected for over a minute.`,
          variant: "destructive",
        });
      } else if (disconnectionNotification.type === 'reconnected') {
        toast({
          title: "Player Reconnected",
          description: `${disconnectionNotification.playerName} has rejoined the game.`,
        });
      } else if (disconnectionNotification.type === 'cpu_activated') {
        toast({
          title: "CPU Taking Over",
          description: `A CPU is now playing for ${disconnectionNotification.playerName}.`,
        });
      }
      clearDisconnectionNotification();
    }
  }, [disconnectionNotification, clearDisconnectionNotification, toast]);

  // Log game start for analytics (all game types for human players)
  const gameStartLoggedRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      gameState?.phase === "determining_dealer" &&
      currentPlayer &&
      !currentPlayer.isCPU &&
      gameStartLoggedRef.current !== gameState.id
    ) {
      gameStartLoggedRef.current = gameState.id;
      logGameStart(
        currentPlayer.name,
        gameState.gameFormat || "traditional",
        gameState.id
      );
    }
  }, [gameState?.phase, gameState?.id, gameState?.gameFormat, currentPlayer]);

  // Auto-save game state for single player and Olympics games
  // Request full unmasked state from server so CPU hands are preserved
  useEffect(() => {
    if (gameState && playerId && (gameState.isSinglePlayer || gameState.isOlympics)) {
      // Clear auto-save when game ends
      if (gameState.phase === "game_end") {
        clearAutoSave();
        return;
      }

      // Request full state from server for saving (CPU hands are masked in client state)
      requestSaveState((fullState) => {
        autoSaveGame(fullState, playerId);
      });
    }
  }, [gameState, playerId, requestSaveState]);

  // Record high score and log game completion when game ends (all game types for human players)
  const highScoreRecordedRef = useRef<string | null>(null);
  useEffect(() => {
    async function recordGameEnd() {
      if (
        gameState?.phase === "game_end" &&
        currentPlayer &&
        !currentPlayer.isCPU &&
        highScoreRecordedRef.current !== gameState.id
      ) {
        highScoreRecordedRef.current = gameState.id;

        // Calculate if player won (highest score)
        const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
        const won = sortedPlayers[0]?.id === currentPlayer.id;

        // Calculate total tricks called from round history
        const totalTricksCalled = gameState.roundHistory.reduce((total, round) => {
          const playerResult = round.playerResults.find(pr => pr.playerId === currentPlayer.id);
          return total + (playerResult?.call || 0);
        }, 0);

        // Determine if this is a multiplayer game (not single player and not Olympics)
        const isMultiplayer = !gameState.isSinglePlayer && !gameState.isOlympics;
        const playerCount = gameState.players.length;

        // Log game completion for analytics
        logGameCompletion(
          currentPlayer.name,
          gameState.gameFormat || "traditional",
          gameState.id,
          currentPlayer.score,
          won,
          totalTricksCalled
        );

        // Save high score
        const result = await saveHighScore(
          currentPlayer.name,
          currentPlayer.score,
          gameState.gameFormat || "traditional",
          isMultiplayer,
          playerCount
        );
        if (result.isHighScore && result.rank !== null) {
          const modeLabel = isMultiplayer ? "Multiplayer" : "vs CPUs";
          toast({
            title: result.rank === 1 ? "New High Score!" : "High Score!",
            description: `You ranked #${result.rank} in ${gameState.gameFormat === "keller" ? "Keller" : "Traditional"} ${modeLabel} (${playerCount} players)!`,
          });
        }
      }
    }
    recordGameEnd();
  }, [gameState?.phase, gameState?.id, gameState?.isSinglePlayer, gameState?.isOlympics, gameState?.gameFormat, gameState?.players, gameState?.roundHistory, currentPlayer, toast]);

  const handleReturnToMenu = () => {
    // Clear session storage to prevent auto-reconnect on page load
    sessionStorage.removeItem('whist_player_id');
    sessionStorage.removeItem('whist_game_id');
    // Suppress auto-reconnect so user lands in lobby with rejoin option
    sessionStorage.setItem('whist_suppress_reconnect', 'true');
    // Keep localStorage multiplayer IDs so user can manually rejoin from lobby
    // Keep auto-save so user can resume from main menu
    window.location.reload();
  };

  // Save game settings when a game starts (for Play Again feature)
  useEffect(() => {
    if (gameState && currentPlayer && gameState.phase === "determining_dealer") {
      const cpuPlayers = gameState.players.filter(p => p.isCPU).length;
      lastGameSettingsRef.current = {
        playerName: currentPlayer.name,
        gameFormat: gameState.gameFormat || "traditional",
        isSinglePlayer: gameState.isSinglePlayer || false,
        cpuCount: cpuPlayers,
        isOlympics: gameState.isOlympics || false,
        countryCode: currentPlayer.countryCode,
      };
    }
  }, [gameState?.phase, gameState?.gameFormat, gameState?.isSinglePlayer, gameState?.isOlympics, gameState?.players, currentPlayer]);

  // Request notification permission for multiplayer games
  useEffect(() => {
    if (gameState && !gameState.isSinglePlayer && !gameState.isOlympics && "Notification" in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, [gameState?.isSinglePlayer, gameState?.isOlympics]);

  // Send browser notification when it's player's turn in multiplayer
  const lastNotifiedTurnRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      gameState &&
      !gameState.isSinglePlayer &&
      !gameState.isOlympics &&
      isMyTurn &&
      (gameState.phase === "calling" || gameState.phase === "playing") &&
      notificationPermission === "granted" &&
      document.hidden // Only notify if tab is not visible
    ) {
      const turnKey = `${gameState.id}-${gameState.currentRound}-${gameState.phase}-${gameState.currentPlayerIndex}`;
      if (lastNotifiedTurnRef.current !== turnKey) {
        lastNotifiedTurnRef.current = turnKey;
        new Notification("Estimation Whist", {
          body: gameState.phase === "calling" ? "It's your turn to call!" : "It's your turn to play!",
          icon: "/favicon.ico",
          tag: "turn-notification",
        });
      }
    }
  }, [gameState, isMyTurn, notificationPermission]);

  // Watchdog: if CPU should be playing but game seems stuck, request fresh state
  // This triggers ensureCPUProcessing() on the server
  useEffect(() => {
    if (
      !gameState ||
      !gameState.isSinglePlayer ||
      isMyTurn ||
      (gameState.phase !== "calling" && gameState.phase !== "playing")
    ) {
      return;
    }

    // If it's not our turn in single player, CPUs should be acting
    // If no state update comes within 10 seconds, poke the server
    const watchdog = setTimeout(() => {
      console.log("Watchdog: game appears stuck, requesting state to trigger CPU processing");
      requestState();
    }, 10000);

    return () => clearTimeout(watchdog);
  }, [gameState, isMyTurn, requestState]);

  // Handle Play Again
  const handlePlayAgain = () => {
    const settings = lastGameSettingsRef.current;
    if (!settings) {
      handleReturnToMenu();
      return;
    }

    // Clear session storage for fresh game
    sessionStorage.removeItem('whist_player_id');
    sessionStorage.removeItem('whist_game_id');
    clearAutoSave();

    if (settings.isOlympics) {
      createOlympicsGame(settings.playerName, settings.countryCode, settings.gameFormat);
    } else if (settings.isSinglePlayer) {
      createSinglePlayerGame(settings.playerName, settings.cpuCount, settings.gameFormat);
    } else {
      // For multiplayer, just go back to menu since we can't recreate the same lobby
      handleReturnToMenu();
    }
  };

  // Not in a game yet - show lobby
  if (!gameState) {
    return (
      <LobbyCreate
        onCreateGame={createGame}
        onCreateSinglePlayerGame={createSinglePlayerGame}
        onCreateOlympicsGame={createOlympicsGame}
        onJoinGame={joinGame}
        onRestoreSavedGame={restoreSavedGame}
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

  // Halo minigame phase (Keller format)
  if (gameState.phase === "halo_minigame" && gameState.haloMinigame) {
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
          <Badge variant="secondary" className="gap-1 bg-purple-500/10 border-purple-500/20">
            <Sparkles className="w-3 h-3 text-purple-500" />
            Keller - Halo
          </Badge>
        </div>
        <HaloMinigame
          haloState={gameState.haloMinigame}
          players={gameState.players}
          playerId={playerId || ""}
          onGuess={haloGuess}
          onBank={haloBank}
          onContinue={haloContinue}
          onAcknowledge={minigameAcknowledge}
        />
      </div>
    );
  }

  // Brucie Bonus phase (Keller format)
  if (gameState.phase === "brucie_bonus" && gameState.brucieBonus) {
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
          <Badge variant="secondary" className="gap-1 bg-green-500/10 border-green-500/20">
            <Sparkles className="w-3 h-3 text-green-500" />
            Keller - Brucie Bonus
          </Badge>
        </div>
        <BrucieBonus
          brucieState={gameState.brucieBonus}
          players={gameState.players}
          playerId={playerId || ""}
          onGuess={brucieGuess}
          onBank={brucieBank}
          onSkip={skipBrucie}
          onContinue={brucieContinue}
          onAcknowledge={minigameAcknowledge}
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
              onPlayAgain={gameState.isSinglePlayer ? handlePlayAgain : undefined}
            />
          </div>
        </div>
      </div>
    );
  }

  // Safety net: if we have game state but can't find our player, show recovery UI
  if (!currentPlayer && (gameState.phase === "calling" || gameState.phase === "playing")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Unable to load game</h2>
          <p className="text-sm text-muted-foreground">
            Your session could not be restored properly.
          </p>
          <Button onClick={handleReturnToMenu} className="gap-2">
            <Home className="w-4 h-4" />
            Return to Menu
          </Button>
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
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={handleSaveGame}
                disabled={saveStatus === "saving"}
              >
                {saveStatus === "saved" ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                {saveStatus === "saved" ? "Saved" : "Save"}
              </Button>
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
            </>
          )}
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              Round {gameState.currentRound}/13
            </div>
            <RulesDialog gameFormat={gameState.gameFormat || "traditional"} />
          </div>
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left sidebar - Scoreboard (desktop only) */}
        <div className="hidden md:block w-64 shrink-0 border-r overflow-y-auto p-1">
          <ScoreBoard
            players={gameState.players}
            roundHistory={gameState.roundHistory}
            currentRound={gameState.currentRound}
            showFullHistory={true}
          />
        </div>

        {/* Main game area */}
        <div className="flex-1 overflow-y-auto p-1 md:p-4">
          {/* Keller Status Bar */}
          {gameState.gameFormat === "keller" && kellerState && (gameState.phase === "calling" || gameState.phase === "playing") && (
            <div className="mb-2">
              <KellerStatusBar
                kellerState={kellerState}
                isCurrentPlayer={isMyTurn}
                isCallingPhase={gameState.phase === "calling"}
                onStartBlindRounds={startBlindRounds}
                onUseSwap={() => setSwapMode(true)}
                swapMode={swapMode && !cardToSwap}
              />
            </div>
          )}

          {/* Swap Confirmation Dialog */}
          {cardToSwap && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card border rounded-lg p-6 max-w-sm mx-4 space-y-4">
                <div className="text-center">
                  <Shuffle className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <h2 className="text-lg font-bold">Confirm Swap</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Swap this card for a random card from the deck?
                  </p>
                </div>
                <div className="flex justify-center">
                  <PlayingCard card={cardToSwap} size="lg" />
                </div>
                <div className="flex gap-3 justify-center">
                  <Button onClick={confirmSwap} className="gap-2">
                    <Check className="w-4 h-4" />
                    Confirm Swap
                  </Button>
                  <Button variant="outline" onClick={cancelSwap}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Swap Result Dialog */}
          {newSwappedCard && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card border rounded-lg p-6 max-w-sm mx-4 space-y-4">
                <div className="text-center">
                  <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <h2 className="text-lg font-bold">Card Swapped!</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    You received this card:
                  </p>
                </div>
                <div className="flex justify-center">
                  <PlayingCard card={newSwappedCard} size="lg" />
                </div>
                <div className="flex justify-center">
                  <Button onClick={dismissSwapResult}>
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* CPU Replacement Vote Dialog */}
          {cpuReplacementVote && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card border rounded-lg p-6 max-w-sm mx-4 space-y-4">
                <div className="text-center">
                  <UserX className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                  <h2 className="text-lg font-bold">Player Disconnected</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">{cpuReplacementVote.disconnectedPlayerName}</span> has been disconnected.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Vote to have a CPU continue in their place?
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{cpuReplacementVote.currentVotes}/{cpuReplacementVote.votesNeeded} votes to proceed</span>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => voteCpuReplacement(cpuReplacementVote.disconnectedPlayerId, true)}
                    className="gap-2"
                  >
                    <Bot className="w-4 h-4" />
                    Let CPU Play
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => voteCpuReplacement(cpuReplacementVote.disconnectedPlayerId, false)}
                  >
                    Wait
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Requires unanimous vote. If they reconnect, they'll take back control.
                </p>
              </div>
            </div>
          )}

          {/* Calling phase - show dialog or waiting message */}
          {gameState.phase === "calling" && (
            <>
              {/* Round 1 Blind Choice Prompt (Keller format) */}
              {needsRoundOneBlindChoice ? (
                <div className="max-w-md mx-auto">
                  <div className="bg-card border rounded-lg p-6 space-y-4">
                    <div className="text-center">
                      <h2 className="text-xl font-bold mb-2">Three Blind Mice</h2>
                      <p className="text-muted-foreground text-sm">
                        Would you like to go blind starting from Round 1?
                      </p>
                      <p className="text-muted-foreground text-xs mt-2">
                        You must complete 3 blind rounds during the game. Going blind now means you won't see your cards before calling.
                      </p>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button
                        onClick={startBlindRoundsNow}
                        className="gap-2 bg-purple-600 hover:bg-purple-700"
                      >
                        <EyeOff className="w-4 h-4" />
                        Go Blind Now
                      </Button>
                      <Button
                        variant="outline"
                        onClick={declineBlindRoundOne}
                      >
                        See My Cards
                      </Button>
                    </div>
                  </div>
                </div>
              ) : isMyTurn && currentPlayer ? (
                <div className="max-w-lg mx-auto space-y-6">
                  <CallDialog
                    cardCount={gameState.cardCount}
                    currentCalls={gameState.players
                      .filter((p) => p.call !== null)
                      .map((p) => ({ playerName: p.name, call: p.call!, isBlindCalling: p.isBlindCalling }))}
                    isDealer={currentPlayer.isDealer}
                    onMakeCall={makeCall}
                    playerName={currentPlayer.name}
                    isBlindCalling={currentPlayer.isBlindCalling}
                    cannotCallZero={kellerState?.consecutiveZeroCalls !== undefined && kellerState.consecutiveZeroCalls >= 2}
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
                        swapMode={swapMode}
                        onSwapCard={handleSwapCard}
                        isBlindMode={currentPlayer.isBlindCalling}
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
                      </span>
                      {gameState.players[gameState.currentPlayerIndex]?.isCPUControlled && (
                        <span className="inline-flex items-center gap-0.5 text-orange-500 ml-1">
                          <Bot className="w-3 h-3" />
                          <span className="text-xs">(CPU)</span>
                        </span>
                      )}{" "}
                      to make their call...
                    </p>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Calls so far:{" "}
                      {gameState.players.filter((p) => p.call !== null).length === 0
                        ? "None yet"
                        : gameState.players
                            .filter((p) => p.call !== null)
                            .map((p, i, arr) => (
                              <span key={p.id}>
                                {p.isBlindCalling && <EyeOff className="w-3 h-3 inline mr-0.5 text-purple-500" />}
                                {p.name}: {p.call}
                                {i < arr.length - 1 ? ", " : ""}
                              </span>
                            ))}
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
                          swapMode={swapMode}
                          onSwapCard={handleSwapCard}
                          isBlindMode={currentPlayer.isBlindCalling}
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
              {/* Table layout with opponents and trick area */}
              <TableLayout
                opponents={opponents}
                currentPlayerId={playerId}
                currentTurnPlayerId={gameState.players[gameState.currentPlayerIndex]?.id || null}
                lastTrickWinnerId={lastTrickWinnerId}
              >
                <TrickArea
                  currentTrick={gameState.currentTrick}
                  players={gameState.players}
                  currentPlayerIndex={gameState.currentPlayerIndex}
                  trump={gameState.trump}
                  roundNumber={gameState.currentRound}
                  cardCount={gameState.cardCount}
                  doublePoints={gameState.doublePoints}
                  trickNumber={gameState.trickNumber}
                  currentPlayerId={playerId}
                />
              </TableLayout>

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

          {/* Mobile scoreboard at bottom */}
          <div className="md:hidden mt-2 border-t pt-2">
            <ScoreBoard
              players={gameState.players}
              roundHistory={gameState.roundHistory}
              currentRound={gameState.currentRound}
              showFullHistory={true}
            />
          </div>
        </div>

        {/* Right sidebar - Chat (multiplayer only) */}
        {!gameState.isSinglePlayer && !gameState.isOlympics && (
          <ChatPanel
            messages={chatMessages}
            currentPlayerId={playerId}
            players={gameState.players}
            unreadCount={unreadChatCount}
            onSendMessage={sendChat}
            onClearUnread={clearUnreadChat}
            provisionalSuggestions={provisionalSuggestions}
            onSuggestProvisional={suggestProvisional}
            onVoteProvisional={voteProvisional}
          />
        )}
      </div>
    </div>
  );
}
