import {
  GameState,
  Player,
  Card,
  Suit,
  Rank,
  Trick,
  RoundResult,
  roundConfigs,
  getRankValue,
  suits,
  ranks,
} from "@shared/schema";
import { randomUUID } from "crypto";

// Generate a short game ID
function generateGameId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create a full deck of cards
function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

// Shuffle deck using Fisher-Yates algorithm
function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export class Game {
  state: GameState;

  constructor(hostName: string, hostId: string) {
    this.state = {
      id: generateGameId(),
      phase: "lobby",
      players: [this.createPlayer(hostName, hostId)],
      currentRound: 0,
      currentPlayerIndex: 0,
      dealerIndex: -1,
      trump: null,
      cardCount: 0,
      doublePoints: false,
      currentTrick: { cards: [], leadSuit: null, winnerId: null },
      trickNumber: 1,
      dealerCards: [],
      roundHistory: [],
    };
  }

  private createPlayer(name: string, id: string): Player {
    return {
      id,
      name,
      hand: [],
      call: null,
      tricksWon: 0,
      score: 0,
      isDealer: false,
      isConnected: true,
    };
  }

  addPlayer(name: string, playerId: string): boolean {
    if (this.state.phase !== "lobby") return false;
    if (this.state.players.length >= 7) return false;
    if (this.state.players.some(p => p.name.toLowerCase() === name.toLowerCase())) return false;

    this.state.players.push(this.createPlayer(name, playerId));
    return true;
  }

  removePlayer(playerId: string): void {
    this.state.players = this.state.players.filter(p => p.id !== playerId);
  }

  startGame(): boolean {
    if (this.state.phase !== "lobby") return false;
    if (this.state.players.length < 2) return false;

    this.state.phase = "determining_dealer";
    this.determineDealerRound();
    return true;
  }

  private determineDealerRound(): void {
    const deck = shuffleDeck(createDeck());
    this.state.dealerCards = [];

    // Deal one card to each player
    for (let i = 0; i < this.state.players.length; i++) {
      this.state.dealerCards.push({
        playerId: this.state.players[i].id,
        card: deck[i],
      });
    }

    // Find highest card(s)
    let highestValue = 0;
    let highestPlayers: number[] = [];

    for (let i = 0; i < this.state.dealerCards.length; i++) {
      const value = getRankValue(this.state.dealerCards[i].card.rank);
      if (value > highestValue) {
        highestValue = value;
        highestPlayers = [i];
      } else if (value === highestValue) {
        highestPlayers.push(i);
      }
    }

    if (highestPlayers.length === 1) {
      // We have a winner
      this.state.dealerIndex = highestPlayers[0];
      this.state.players.forEach((p, i) => {
        p.isDealer = i === this.state.dealerIndex;
      });

      // Start the first round after a delay
      setTimeout(() => {
        this.startRound(1);
      }, 3000);
    } else {
      // Tie - deal again after delay
      setTimeout(() => {
        this.determineDealerRound();
      }, 2000);
    }
  }

  private startRound(roundNumber: number): void {
    const config = roundConfigs[roundNumber - 1];
    if (!config) return;

    this.state.currentRound = roundNumber;
    this.state.cardCount = config.cardCount;
    this.state.trump = config.trump;
    this.state.doublePoints = config.doublePoints;
    this.state.trickNumber = 1;
    this.state.currentTrick = { cards: [], leadSuit: null, winnerId: null };

    // Reset players for new round
    this.state.players.forEach(p => {
      p.hand = [];
      p.call = null;
      p.tricksWon = 0;
    });

    // Deal cards
    const deck = shuffleDeck(createDeck());
    let cardIndex = 0;
    for (let c = 0; c < this.state.cardCount; c++) {
      for (let p = 0; p < this.state.players.length; p++) {
        this.state.players[p].hand.push(deck[cardIndex++]);
      }
    }

    // Sort each player's hand
    this.state.players.forEach(p => {
      p.hand.sort((a, b) => {
        const suitOrder: Record<Suit, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
        if (suitOrder[a.suit] !== suitOrder[b.suit]) {
          return suitOrder[a.suit] - suitOrder[b.suit];
        }
        return getRankValue(a.rank) - getRankValue(b.rank);
      });
    });

    // Set calling phase, starting with player to the left of dealer
    this.state.phase = "calling";
    this.state.currentPlayerIndex = (this.state.dealerIndex + 1) % this.state.players.length;
  }

  makeCall(playerId: string, call: number): boolean {
    if (this.state.phase !== "calling") return false;

    const player = this.state.players[this.state.currentPlayerIndex];
    if (player.id !== playerId) return false;

    // Validate call
    if (call < 0 || call > this.state.cardCount) return false;

    // Check dealer restriction
    if (player.isDealer) {
      const totalCalled = this.state.players.reduce((sum, p) => sum + (p.call ?? 0), 0);
      const forbidden = this.state.cardCount - totalCalled;
      if (call === forbidden) return false;
    }

    player.call = call;

    // Move to next player or start playing
    const nextIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    
    // Check if all players have called (we've gone around to the player after dealer)
    const allCalled = this.state.players.every(p => p.call !== null);
    
    if (allCalled) {
      this.state.phase = "playing";
      // First player to play is player to the left of dealer
      this.state.currentPlayerIndex = (this.state.dealerIndex + 1) % this.state.players.length;
    } else {
      this.state.currentPlayerIndex = nextIndex;
    }

    return true;
  }

  playCard(playerId: string, card: Card): boolean {
    if (this.state.phase !== "playing") return false;

    const playerIndex = this.state.currentPlayerIndex;
    const player = this.state.players[playerIndex];
    if (player.id !== playerId) return false;

    // Check if card is in hand
    const cardIndex = player.hand.findIndex(
      c => c.suit === card.suit && c.rank === card.rank
    );
    if (cardIndex === -1) return false;

    // Check if player must follow suit
    const leadSuit = this.state.currentTrick.leadSuit;
    if (leadSuit) {
      const hasSuit = player.hand.some(c => c.suit === leadSuit);
      if (hasSuit && card.suit !== leadSuit) {
        return false; // Must follow suit
      }
    }

    // Remove card from hand
    player.hand.splice(cardIndex, 1);

    // Add to current trick
    this.state.currentTrick.cards.push({ playerId, card });
    if (!this.state.currentTrick.leadSuit) {
      this.state.currentTrick.leadSuit = card.suit;
    }

    // Check if trick is complete
    if (this.state.currentTrick.cards.length === this.state.players.length) {
      // Determine winner
      const winnerId = this.determineTrickWinner();
      this.state.currentTrick.winnerId = winnerId;

      const winner = this.state.players.find(p => p.id === winnerId);
      if (winner) {
        winner.tricksWon++;
      }

      // Check if round is complete
      if (this.state.trickNumber >= this.state.cardCount) {
        // Round is over
        setTimeout(() => {
          this.endRound();
        }, 2000);
      } else {
        // Next trick
        setTimeout(() => {
          this.startNextTrick(winnerId);
        }, 2000);
      }
    } else {
      // Next player
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    }

    return true;
  }

  private determineTrickWinner(): string {
    const { cards, leadSuit } = this.state.currentTrick;
    const trump = this.state.trump;

    let winningCard = cards[0];
    let winningValue = this.getCardTrickValue(winningCard.card, leadSuit!, trump);

    for (let i = 1; i < cards.length; i++) {
      const value = this.getCardTrickValue(cards[i].card, leadSuit!, trump);
      if (value > winningValue) {
        winningValue = value;
        winningCard = cards[i];
      }
    }

    return winningCard.playerId;
  }

  private getCardTrickValue(card: Card, leadSuit: Suit, trump: Suit | null): number {
    const baseValue = getRankValue(card.rank);

    if (trump && card.suit === trump) {
      return 100 + baseValue; // Trump beats all
    }
    if (card.suit === leadSuit) {
      return baseValue; // Following suit
    }
    return 0; // Off suit (can't win)
  }

  private startNextTrick(winnerId: string): void {
    this.state.trickNumber++;
    this.state.currentTrick = { cards: [], leadSuit: null, winnerId: null };

    // Winner leads next trick
    const winnerIndex = this.state.players.findIndex(p => p.id === winnerId);
    this.state.currentPlayerIndex = winnerIndex;
  }

  private endRound(): void {
    // Calculate scores
    const roundResult: RoundResult = {
      roundNumber: this.state.currentRound,
      playerResults: [],
    };

    for (const player of this.state.players) {
      let roundScore = 0;

      if (player.call === null) continue;

      if (player.tricksWon === player.call) {
        // Hit target: 10 + tricks won
        roundScore = 10 + player.tricksWon;
      } else if (player.tricksWon > player.call) {
        // Over: just the tricks won
        roundScore = player.tricksWon;
      } else {
        // Under: 0 points
        roundScore = 0;
      }

      // Apply double points for final round
      if (this.state.doublePoints) {
        roundScore *= 2;
      }

      player.score += roundScore;

      roundResult.playerResults.push({
        playerId: player.id,
        playerName: player.name,
        call: player.call,
        tricksWon: player.tricksWon,
        roundScore,
      });
    }

    this.state.roundHistory.push(roundResult);
    this.state.phase = "round_end";
  }

  nextRound(): void {
    if (this.state.phase !== "round_end") return;

    if (this.state.currentRound >= 13) {
      // Game is over
      this.state.phase = "game_end";
      return;
    }

    // Move dealer to next player
    this.state.players.forEach(p => p.isDealer = false);
    this.state.dealerIndex = (this.state.dealerIndex + 1) % this.state.players.length;
    this.state.players[this.state.dealerIndex].isDealer = true;

    // Start next round
    this.startRound(this.state.currentRound + 1);
  }

  // Get state for a specific player (hide other players' hands)
  getStateForPlayer(playerId: string): GameState {
    const state = JSON.parse(JSON.stringify(this.state)) as GameState;

    // Hide other players' hands in playing phase
    if (state.phase === "playing" || state.phase === "calling") {
      for (const player of state.players) {
        if (player.id !== playerId) {
          player.hand = player.hand.map(() => ({ suit: "clubs" as Suit, rank: "2" as Rank }));
        }
      }
    }

    return state;
  }
}

// Game manager to handle multiple games
class GameManager {
  private games: Map<string, Game> = new Map();
  private playerGameMap: Map<string, string> = new Map(); // playerId -> gameId

  createGame(hostName: string, hostId: string): Game {
    const game = new Game(hostName, hostId);
    this.games.set(game.state.id, game);
    this.playerGameMap.set(hostId, game.state.id);
    return game;
  }

  joinGame(gameId: string, playerName: string, playerId: string): Game | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    if (game.addPlayer(playerName, playerId)) {
      this.playerGameMap.set(playerId, gameId);
      return game;
    }

    return null;
  }

  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  getGameForPlayer(playerId: string): Game | undefined {
    const gameId = this.playerGameMap.get(playerId);
    if (!gameId) return undefined;
    return this.games.get(gameId);
  }

  removePlayer(playerId: string): void {
    const gameId = this.playerGameMap.get(playerId);
    if (gameId) {
      const game = this.games.get(gameId);
      if (game) {
        game.removePlayer(playerId);
        if (game.state.players.length === 0) {
          this.games.delete(gameId);
        }
      }
      this.playerGameMap.delete(playerId);
    }
  }
}

export const gameManager = new GameManager();
