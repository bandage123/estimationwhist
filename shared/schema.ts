import { z } from "zod";

// Card suits and ranks
export const suits = ["clubs", "diamonds", "hearts", "spades"] as const;
export const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

export type Suit = typeof suits[number];
export type Rank = typeof ranks[number];

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  call: number | null;
  tricksWon: number;
  score: number;
  isDealer: boolean;
  isConnected: boolean;
  isCPU: boolean;
}

export interface Trick {
  cards: { playerId: string; card: Card }[];
  leadSuit: Suit | null;
  winnerId: string | null;
}

// Round structure with trump and card count
export interface RoundConfig {
  roundNumber: number;
  cardCount: number;
  trump: Suit | null; // null means no trump
  doublePoints: boolean;
}

// 13 rounds configuration
export const roundConfigs: RoundConfig[] = [
  { roundNumber: 1, cardCount: 7, trump: "clubs", doublePoints: false },
  { roundNumber: 2, cardCount: 6, trump: "diamonds", doublePoints: false },
  { roundNumber: 3, cardCount: 5, trump: "hearts", doublePoints: false },
  { roundNumber: 4, cardCount: 4, trump: "spades", doublePoints: false },
  { roundNumber: 5, cardCount: 3, trump: null, doublePoints: false },
  { roundNumber: 6, cardCount: 2, trump: "clubs", doublePoints: false },
  { roundNumber: 7, cardCount: 1, trump: "diamonds", doublePoints: false },
  { roundNumber: 8, cardCount: 2, trump: "hearts", doublePoints: false },
  { roundNumber: 9, cardCount: 3, trump: "spades", doublePoints: false },
  { roundNumber: 10, cardCount: 4, trump: null, doublePoints: false },
  { roundNumber: 11, cardCount: 5, trump: "clubs", doublePoints: false },
  { roundNumber: 12, cardCount: 6, trump: "diamonds", doublePoints: false },
  { roundNumber: 13, cardCount: 7, trump: "hearts", doublePoints: true },
];

export type GamePhase = 
  | "lobby"
  | "determining_dealer"
  | "calling"
  | "playing"
  | "round_end"
  | "game_end";

export interface GameState {
  id: string;
  phase: GamePhase;
  players: Player[];
  currentRound: number;
  currentPlayerIndex: number; // Who's turn to call or play
  dealerIndex: number;
  trump: Suit | null;
  cardCount: number;
  doublePoints: boolean;
  currentTrick: Trick;
  trickNumber: number;
  dealerCards: { playerId: string; card: Card }[]; // For dealer determination
  roundHistory: RoundResult[];
  isSinglePlayer: boolean;
}

export interface RoundResult {
  roundNumber: number;
  playerResults: {
    playerId: string;
    playerName: string;
    call: number;
    tricksWon: number;
    roundScore: number;
  }[];
}

// WebSocket message types
export type ClientMessage =
  | { type: "create_game"; playerName: string }
  | { type: "create_single_player_game"; playerName: string; cpuCount: number }
  | { type: "join_game"; gameId: string; playerName: string }
  | { type: "start_game" }
  | { type: "make_call"; call: number }
  | { type: "play_card"; card: Card }
  | { type: "next_round" }
  | { type: "request_state" };

export type ServerMessage =
  | { type: "game_created"; gameId: string; playerId: string }
  | { type: "game_joined"; playerId: string }
  | { type: "game_state"; state: GameState; playerId: string }
  | { type: "error"; message: string }
  | { type: "player_joined"; playerName: string }
  | { type: "player_left"; playerName: string };

// Validation schemas
export const createGameSchema = z.object({
  playerName: z.string().min(1).max(20),
});

export const joinGameSchema = z.object({
  gameId: z.string().min(1),
  playerName: z.string().min(1).max(20),
});

export const makeCallSchema = z.object({
  call: z.number().min(0).max(7),
});

export const playCardSchema = z.object({
  card: z.object({
    suit: z.enum(suits),
    rank: z.enum(ranks),
  }),
});

// Helper functions for card comparison
export function getRankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
    "8": 8, "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14
  };
  return values[rank];
}

export function compareCards(a: Card, b: Card): number {
  return getRankValue(a.rank) - getRankValue(b.rank);
}
