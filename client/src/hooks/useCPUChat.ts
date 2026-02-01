import { useState, useEffect, useRef, useCallback } from "react";
import { Player, GameState, ChatMessage } from "@shared/schema";
import {
  PersonalityType,
  assignPersonality,
  getMessage,
  isAddressedTo,
} from "@/lib/cpuPersonalities";

interface CPUChatState {
  personalities: Map<string, PersonalityType>;
  usedMessages: Map<string, Set<string>>;
}

interface UseCPUChatOptions {
  gameState: GameState | null;
  playerId: string | null;
  enabled: boolean;
}

interface UseCPUChatReturn {
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  clearMessages: () => void;
}

export function useCPUChat({
  gameState,
  playerId,
  enabled,
}: UseCPUChatOptions): UseCPUChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const stateRef = useRef<CPUChatState>({
    personalities: new Map(),
    usedMessages: new Map(),
  });

  // Track previous state for detecting changes
  const prevStateRef = useRef<{
    round: number;
    phase: string;
    playerResults: Map<string, { tricksWon: number; call: number | null }>;
  } | null>(null);

  // Initialize personalities for CPUs
  useEffect(() => {
    if (!gameState) return;

    const cpuPlayers = gameState.players.filter(p => p.isCPU || p.isCPUControlled);
    cpuPlayers.forEach((player, index) => {
      if (!stateRef.current.personalities.has(player.id)) {
        const personality = assignPersonality(player.id, index);
        stateRef.current.personalities.set(player.id, personality);
        stateRef.current.usedMessages.set(player.id, new Set());
      }
    });
  }, [gameState?.players]);

  // Add a CPU message
  const addCPUMessage = useCallback((player: Player, text: string) => {
    if (!enabled) return;

    const message: ChatMessage = {
      id: `cpu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId: player.id,
      playerName: player.name,
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, message]);
  }, [enabled]);

  // Get message for a CPU player
  const getCPUMessage = useCallback((
    player: Player,
    event: Parameters<typeof getMessage>[1]
  ): string | null => {
    const personality = stateRef.current.personalities.get(player.id);
    if (!personality) return null;

    const usedMessages = stateRef.current.usedMessages.get(player.id);
    return getMessage(personality, event, usedMessages);
  }, []);

  // Trigger CPU messages with random delay
  const triggerCPUMessage = useCallback((
    player: Player,
    event: Parameters<typeof getMessage>[1],
    delayMs: number = 0
  ) => {
    // Random chance to skip (keep messages rare)
    if (Math.random() > 0.1) return;

    const message = getCPUMessage(player, event);
    if (!message) return;

    setTimeout(() => {
      addCPUMessage(player, message);
    }, delayMs + Math.random() * 1000);
  }, [getCPUMessage, addCPUMessage]);

  // Watch for game events
  useEffect(() => {
    if (!gameState || !enabled) return;

    const prev = prevStateRef.current;
    const cpuPlayers = gameState.players.filter(p => p.isCPU || p.isCPUControlled);

    // New round started
    if (prev && gameState.currentRound > prev.round && gameState.phase === "calling") {
      // Pick 1-2 CPUs to comment on round start
      const commenters = cpuPlayers
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.random() > 0.5 ? 1 : 2);

      commenters.forEach((player, i) => {
        triggerCPUMessage(player, "roundStart", i * 1500);
      });
    }

    // Round ended - check contract hits/misses
    if (prev && prev.phase === "playing" && gameState.phase === "round_end") {
      cpuPlayers.forEach((player, i) => {
        const prevResult = prev.playerResults.get(player.id);
        if (prevResult && player.call !== null) {
          if (player.tricksWon === player.call) {
            triggerCPUMessage(player, "hitContract", i * 800);
          } else if (player.tricksWon > player.call) {
            triggerCPUMessage(player, "overTricked", i * 800);
          } else {
            triggerCPUMessage(player, "missedContract", i * 800);
          }
        }
      });

      // Comment on user's performance
      const userPlayer = gameState.players.find(p => p.id === playerId);
      if (userPlayer && userPlayer.call !== null) {
        const commenter = cpuPlayers[Math.floor(Math.random() * cpuPlayers.length)];
        if (commenter && Math.random() < 0.07) {
          const event = userPlayer.tricksWon === userPlayer.call
            ? "userHitContract"
            : "userMissedContract";
          triggerCPUMessage(commenter, event, cpuPlayers.length * 800 + 500);
        }
      }
    }

    // Game ended
    if (prev && prev.phase !== "game_end" && gameState.phase === "game_end") {
      const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
      const winner = sortedPlayers[0];

      cpuPlayers.forEach((player, i) => {
        const event = player.id === winner.id ? "gameWin" : "gameLose";
        triggerCPUMessage(player, event, i * 1200);
      });
    }

    // Update previous state
    prevStateRef.current = {
      round: gameState.currentRound,
      phase: gameState.phase,
      playerResults: new Map(
        gameState.players.map(p => [p.id, { tricksWon: p.tricksWon, call: p.call }])
      ),
    };
  }, [gameState?.currentRound, gameState?.phase, enabled, playerId, triggerCPUMessage]);

  // User sends a message
  const sendMessage = useCallback((text: string) => {
    if (!gameState || !playerId) return;

    const userPlayer = gameState.players.find(p => p.id === playerId);
    if (!userPlayer) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playerId: playerId,
      playerName: userPlayer.name,
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Check if any CPU is addressed and respond
    const cpuPlayers = gameState.players.filter(p => p.isCPU || p.isCPUControlled);

    // First check for direct mentions
    const addressedCPU = cpuPlayers.find(p => isAddressedTo(text, p.name));

    if (addressedCPU) {
      // Addressed CPU responds
      setTimeout(() => {
        const response = getCPUMessage(addressedCPU, "respondToUser");
        if (response) {
          addCPUMessage(addressedCPU, response);
        }
      }, 1000 + Math.random() * 1500);
    } else if (Math.random() < 0.06) {
      // Random CPU might respond to general chat (rare)
      const randomCPU = cpuPlayers[Math.floor(Math.random() * cpuPlayers.length)];
      if (randomCPU) {
        setTimeout(() => {
          const response = getCPUMessage(randomCPU, "respondToUser");
          if (response) {
            addCPUMessage(randomCPU, response);
          }
        }, 1500 + Math.random() * 2000);
      }
    }
  }, [gameState, playerId, getCPUMessage, addCPUMessage]);

  // Clear messages (for new game)
  const clearMessages = useCallback(() => {
    setMessages([]);
    prevStateRef.current = null;
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
  };
}
