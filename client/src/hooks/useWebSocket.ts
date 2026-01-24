import { useState, useEffect, useCallback, useRef } from "react";
import { GameState, ClientMessage, ServerMessage, Card, SpeedSetting } from "@shared/schema";

interface UseWebSocketReturn {
  gameState: GameState | null;
  playerId: string | null;
  gameId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  createGame: (playerName: string) => void;
  createSinglePlayerGame: (playerName: string, cpuCount: number) => void;
  createOlympicsGame: (playerName: string, countryCode?: string) => void;
  joinGame: (gameId: string, playerName: string) => void;
  startGame: () => void;
  makeCall: (call: number) => void;
  playCard: (card: Card) => void;
  nextRound: () => void;
  nextOlympicsGame: () => void;
  startOlympicsQualifying: () => void;
  startOlympicsFinals: () => void;
  setSpeed: (speed: SpeedSetting) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMessageRef = useRef<ClientMessage | null>(null);

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
      
      // Send pending message if any
      if (pendingMessageRef.current) {
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
            break;
          case "game_joined":
            setPlayerId(message.playerId);
            break;
          case "game_state":
            setGameState(message.state);
            setPlayerId(message.playerId);
            if (!gameId) {
              setGameId(message.state.id);
            }
            break;
          case "error":
            setError(message.message);
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

      // Attempt to reconnect if we had a game
      if (gameId && playerId) {
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

  const createGame = useCallback((playerName: string) => {
    sendMessage({ type: "create_game", playerName });
  }, [sendMessage]);

  const createSinglePlayerGame = useCallback((playerName: string, cpuCount: number) => {
    sendMessage({ type: "create_single_player_game", playerName, cpuCount });
  }, [sendMessage]);

  const createOlympicsGame = useCallback((playerName: string, countryCode?: string) => {
    sendMessage({ type: "create_olympics_game", playerName, countryCode });
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

  return {
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
  };
}
