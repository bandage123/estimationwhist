import { useState, useEffect, useCallback, useRef } from "react";
import { GameState, ClientMessage, ServerMessage, Card, SpeedSetting, GameFormat } from "@shared/schema";
import { deleteSavedGame } from "@/lib/savedGames";

// Disconnection notification state
interface DisconnectionNotification {
  playerId: string;
  playerName: string;
  type: 'disconnected' | 'reconnected' | 'cpu_activated';
}

// CPU replacement vote state
interface CpuReplacementVote {
  disconnectedPlayerId: string;
  disconnectedPlayerName: string;
  votesNeeded: number;
  currentVotes: number;
}

interface UseWebSocketReturn {
  gameState: GameState | null;
  playerId: string | null;
  gameId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  // Disconnection handling
  disconnectionNotification: DisconnectionNotification | null;
  cpuReplacementVote: CpuReplacementVote | null;
  clearDisconnectionNotification: () => void;
  voteCpuReplacement: (disconnectedPlayerId: string, vote: boolean) => void;
  createGame: (playerName: string, gameFormat?: GameFormat) => void;
  createSinglePlayerGame: (playerName: string, cpuCount: number, gameFormat?: GameFormat) => void;
  createOlympicsGame: (playerName: string, countryCode?: string, gameFormat?: GameFormat) => void;
  joinGame: (gameId: string, playerName: string) => void;
  startGame: () => void;
  makeCall: (call: number) => void;
  playCard: (card: Card) => void;
  nextRound: () => void;
  nextOlympicsGame: () => void;
  startOlympicsQualifying: () => void;
  startOlympicsFinals: () => void;
  setSpeed: (speed: SpeedSetting) => void;
  // Keller format actions
  startBlindRounds: () => void;
  startBlindRoundsNow: () => void;
  declineBlindRoundOne: () => void;
  useSwap: (cardToSwap: Card) => void;
  haloGuess: (guess: "higher" | "lower" | "same") => void;
  haloBank: () => void;
  haloContinue: () => void;
  brucieGuess: (guess: "higher" | "lower") => void;
  brucieBank: () => void;
  skipBrucie: () => void;
  brucieContinue: () => void;
  restoreSavedGame: (savedState: GameState, saveId: string) => void;
  minigameAcknowledge: () => void;
}

// Session storage keys for reconnection
const SESSION_PLAYER_ID_KEY = 'whist_player_id';
const SESSION_GAME_ID_KEY = 'whist_game_id';

export function useWebSocket(): UseWebSocketReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Disconnection handling state
  const [disconnectionNotification, setDisconnectionNotification] = useState<DisconnectionNotification | null>(null);
  const [cpuReplacementVote, setCpuReplacementVote] = useState<CpuReplacementVote | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMessageRef = useRef<ClientMessage | null>(null);
  const reconnectAttemptedRef = useRef<boolean>(false);
  const votedPlayersRef = useRef<Set<string>>(new Set()); // Track players we've voted on

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);

      // Check for stored session to attempt reconnection
      const storedPlayerId = sessionStorage.getItem(SESSION_PLAYER_ID_KEY);
      const storedGameId = sessionStorage.getItem(SESSION_GAME_ID_KEY);

      if (storedPlayerId && storedGameId && !reconnectAttemptedRef.current) {
        reconnectAttemptedRef.current = true;
        console.log(`Attempting to reconnect: playerId=${storedPlayerId}, gameId=${storedGameId}`);
        ws.send(JSON.stringify({
          type: "reconnect",
          playerId: storedPlayerId,
          gameId: storedGameId
        }));
      } else if (pendingMessageRef.current) {
        // Send pending message if any (for new game creation)
        ws.send(JSON.stringify(pendingMessageRef.current));
        pendingMessageRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case "game_created":
            setGameId(message.gameId);
            setPlayerId(message.playerId);
            // Store for reconnection
            sessionStorage.setItem(SESSION_PLAYER_ID_KEY, message.playerId);
            sessionStorage.setItem(SESSION_GAME_ID_KEY, message.gameId);
            break;
          case "game_joined":
            setPlayerId(message.playerId);
            // Store for reconnection
            sessionStorage.setItem(SESSION_PLAYER_ID_KEY, message.playerId);
            break;
          case "game_state":
            setGameState(message.state);
            setPlayerId(message.playerId);
            if (!gameId) {
              setGameId(message.state.id);
            }
            // Store for reconnection
            sessionStorage.setItem(SESSION_PLAYER_ID_KEY, message.playerId);
            sessionStorage.setItem(SESSION_GAME_ID_KEY, message.state.id);
            // Clear reconnect flag on successful state receive
            reconnectAttemptedRef.current = false;
            break;
          case "error":
            setError(message.message);
            // If reconnect failed, clear stored session and allow new game creation
            if (message.message.includes("Could not reconnect")) {
              sessionStorage.removeItem(SESSION_PLAYER_ID_KEY);
              sessionStorage.removeItem(SESSION_GAME_ID_KEY);
              reconnectAttemptedRef.current = false;
            }
            break;
          case "player_disconnected":
            setDisconnectionNotification({
              playerId: message.playerId,
              playerName: message.playerName,
              type: 'disconnected'
            });
            break;
          case "player_reconnected":
            setDisconnectionNotification({
              playerId: message.playerId,
              playerName: message.playerName,
              type: 'reconnected'
            });
            // Clear any pending vote for this player
            setCpuReplacementVote(prev =>
              prev?.disconnectedPlayerId === message.playerId ? null : prev
            );
            // Clear from voted set so they can vote again if player disconnects again
            votedPlayersRef.current.delete(message.playerId);
            break;
          case "cpu_replacement_vote_update":
            // Only show vote dialog if we haven't already voted for this player
            if (!votedPlayersRef.current.has(message.disconnectedPlayerId)) {
              setCpuReplacementVote({
                disconnectedPlayerId: message.disconnectedPlayerId,
                disconnectedPlayerName: message.disconnectedPlayerName,
                votesNeeded: message.votesNeeded,
                currentVotes: message.currentVotes
              });
            }
            break;
          case "cpu_replacement_activated":
            setDisconnectionNotification({
              playerId: '',
              playerName: message.playerName,
              type: 'cpu_activated'
            });
            // Clear the vote state and voted tracking
            setCpuReplacementVote(null);
            votedPlayersRef.current.clear();
            break;
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsConnecting(false);
      wsRef.current = null;

      // Attempt to reconnect if we had a game (check both state and storage)
      const storedPlayerId = sessionStorage.getItem(SESSION_PLAYER_ID_KEY);
      const storedGameId = sessionStorage.getItem(SESSION_GAME_ID_KEY);
      if ((gameId && playerId) || (storedPlayerId && storedGameId)) {
        reconnectAttemptedRef.current = false; // Reset so we can try reconnect again
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      }
    };

    ws.onerror = () => {
      setError("Connection error. Please try again.");
      setIsConnecting(false);
    };
  }, [gameId, playerId]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      pendingMessageRef.current = message;
      connect();
    }
  }, [connect]);

  const createGame = useCallback((playerName: string, gameFormat?: GameFormat) => {
    sendMessage({ type: "create_game", playerName, gameFormat });
  }, [sendMessage]);

  const createSinglePlayerGame = useCallback((playerName: string, cpuCount: number, gameFormat?: GameFormat) => {
    sendMessage({ type: "create_single_player_game", playerName, cpuCount, gameFormat });
  }, [sendMessage]);

  const createOlympicsGame = useCallback((playerName: string, countryCode?: string, gameFormat?: GameFormat) => {
    sendMessage({ type: "create_olympics_game", playerName, countryCode, gameFormat });
  }, [sendMessage]);

  const joinGame = useCallback((gameId: string, playerName: string) => {
    setGameId(gameId);
    sendMessage({ type: "join_game", gameId, playerName });
  }, [sendMessage]);

  const startGame = useCallback(() => {
    sendMessage({ type: "start_game" });
  }, [sendMessage]);

  const makeCall = useCallback((call: number) => {
    sendMessage({ type: "make_call", call });
  }, [sendMessage]);

  const playCard = useCallback((card: Card) => {
    sendMessage({ type: "play_card", card });
  }, [sendMessage]);

  const nextRound = useCallback(() => {
    sendMessage({ type: "next_round" });
  }, [sendMessage]);

  const nextOlympicsGame = useCallback(() => {
    sendMessage({ type: "next_olympics_game" });
  }, [sendMessage]);

  const startOlympicsQualifying = useCallback(() => {
    sendMessage({ type: "start_olympics_qualifying" });
  }, [sendMessage]);

  const startOlympicsFinals = useCallback(() => {
    sendMessage({ type: "start_olympics_finals" });
  }, [sendMessage]);

  const setSpeed = useCallback((speed: SpeedSetting) => {
    sendMessage({ type: "set_speed", speed });
  }, [sendMessage]);

  // Keller format actions
  const startBlindRounds = useCallback(() => {
    sendMessage({ type: "start_blind_rounds" });
  }, [sendMessage]);

  const startBlindRoundsNow = useCallback(() => {
    sendMessage({ type: "start_blind_rounds_now" });
  }, [sendMessage]);

  const declineBlindRoundOne = useCallback(() => {
    sendMessage({ type: "decline_blind_round_one" });
  }, [sendMessage]);

  const useSwap = useCallback((cardToSwap: Card) => {
    sendMessage({ type: "use_swap", cardToSwap });
  }, [sendMessage]);

  const haloGuess = useCallback((guess: "higher" | "lower" | "same") => {
    sendMessage({ type: "halo_guess", guess });
  }, [sendMessage]);

  const haloBank = useCallback(() => {
    sendMessage({ type: "halo_bank" });
  }, [sendMessage]);

  const haloContinue = useCallback(() => {
    sendMessage({ type: "halo_continue" });
  }, [sendMessage]);

  const brucieGuess = useCallback((guess: "higher" | "lower") => {
    sendMessage({ type: "brucie_guess", guess });
  }, [sendMessage]);

  const brucieBank = useCallback(() => {
    sendMessage({ type: "brucie_bank" });
  }, [sendMessage]);

  const skipBrucie = useCallback(() => {
    sendMessage({ type: "skip_brucie" });
  }, [sendMessage]);

  const brucieContinue = useCallback(() => {
    sendMessage({ type: "brucie_continue" });
  }, [sendMessage]);

  const restoreSavedGame = useCallback((savedState: GameState, saveId: string) => {
    sendMessage({ type: "restore_saved_game", savedState });
    // Delete the save after restoring (it will be re-saved if user saves again)
    deleteSavedGame(saveId);
  }, [sendMessage]);

  const minigameAcknowledge = useCallback(() => {
    sendMessage({ type: "minigame_acknowledge" });
  }, [sendMessage]);

  // Disconnection handling actions
  const clearDisconnectionNotification = useCallback(() => {
    setDisconnectionNotification(null);
  }, []);

  const voteCpuReplacement = useCallback((disconnectedPlayerId: string, vote: boolean) => {
    sendMessage({ type: "vote_cpu_replacement", disconnectedPlayerId, vote });
    // Track that we voted and close the dialog
    votedPlayersRef.current.add(disconnectedPlayerId);
    setCpuReplacementVote(null);
  }, [sendMessage]);

  return {
    gameState,
    playerId,
    gameId,
    isConnected,
    isConnecting,
    error,
    // Disconnection handling
    disconnectionNotification,
    cpuReplacementVote,
    clearDisconnectionNotification,
    voteCpuReplacement,
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
  };
}
