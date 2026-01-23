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
  OlympicsState,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { generateOlympicsPlayers } from "@shared/olympicsData";

const CPU_NAMES = [
  "Alice", "Bob", "Charlie", "Diana", "Edward", "Fiona"
];

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

// Callback type for state updates
type StateUpdateCallback = () => void;

export class Game {
  state: GameState;
  private onStateUpdate: StateUpdateCallback | null = null;
  private cpuProcessingTimeout: NodeJS.Timeout | null = null; // Track CPU processing timeout

  constructor(hostName: string, hostId: string, isSinglePlayer: boolean = false, cpuCount: number = 0) {
    this.state = {
      id: generateGameId(),
      phase: "lobby",
      players: [this.createPlayer(hostName, hostId, false)],
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
      isSinglePlayer,
    };

    // Add CPU players for single player mode
    if (isSinglePlayer && cpuCount > 0) {
      for (let i = 0; i < Math.min(cpuCount, 6); i++) {
        this.state.players.push(this.createPlayer(CPU_NAMES[i], randomUUID(), true));
      }
    }
  }

  setOnStateUpdate(callback: StateUpdateCallback): void {
    this.onStateUpdate = callback;
  }

  private notifyStateUpdate(): void {
    if (this.onStateUpdate) {
      this.onStateUpdate();
    }
  }

  private createPlayer(name: string, id: string, isCPU: boolean = false): Player {
    return {
      id,
      name,
      hand: [],
      call: null,
      tricksWon: 0,
      score: 0,
      isDealer: false,
      isConnected: true,
      isCPU,
    };
  }

  addPlayer(name: string, playerId: string): boolean {
    if (this.state.phase !== "lobby") return false;
    if (this.state.players.length >= 7) return false;
    if (this.state.players.some(p => p.name.toLowerCase() === name.toLowerCase())) return false;

    this.state.players.push(this.createPlayer(name, playerId, false));
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

    this.notifyStateUpdate();

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
        this.notifyStateUpdate();
        this.processCPUTurns();
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

  // CPU AI: Generate a call based on hand strength
  private generateCPUCall(player: Player): number {
    const hand = player.hand;
    const trump = this.state.trump;
    const numPlayers = this.state.players.length;
    
    // Count cards by suit
    const suitCounts: Record<Suit, number> = { clubs: 0, diamonds: 0, hearts: 0, spades: 0 };
    for (const card of hand) {
      suitCounts[card.suit]++;
    }
    
    // Evaluate each card's likelihood of winning a trick
    let expectedWins = 0;
    
    for (const card of hand) {
      const value = getRankValue(card.rank);
      const isInTrump = trump && card.suit === trump;
      const cardsInSuit = suitCounts[card.suit];
      
      if (isInTrump) {
        // Trump cards are very powerful
        if (value === 14) {
          // Ace of trumps - almost guaranteed win
          expectedWins += 0.95;
        } else if (value === 13) {
          // King of trumps - very likely win
          expectedWins += 0.85;
        } else if (value === 12) {
          // Queen of trumps
          expectedWins += 0.70;
        } else if (value >= 10) {
          // Jack/10 of trumps
          expectedWins += 0.50;
        } else {
          // Low trumps - can still win when trumping
          expectedWins += 0.30;
        }
      } else {
        // Non-trump cards
        if (value === 14) {
          // Ace - very likely to win when leading or following suit
          expectedWins += 0.80 / Math.sqrt(numPlayers / 2);
        } else if (value === 13) {
          // King - strong but can be beaten by Ace
          expectedWins += 0.55 / Math.sqrt(numPlayers / 2);
        } else if (value === 12) {
          // Queen
          expectedWins += 0.35 / Math.sqrt(numPlayers / 2);
        } else if (value >= 10) {
          // Jack/10
          expectedWins += 0.15 / Math.sqrt(numPlayers / 2);
        }
        // Low non-trump cards get 0 expected wins
        
        // Singleton or doubleton high cards are weaker (can get trumped)
        if (trump && cardsInSuit <= 2 && value >= 12) {
          expectedWins -= 0.15;
        }
        
        // Void in a suit with trump gives opportunity to trump in
        if (trump && cardsInSuit === 0 && suitCounts[trump] > 0) {
          // Small bonus for having a void (can trump)
          expectedWins += 0.1;
        }
      }
    }
    
    // Adjust for number of cards (more cards = more chances to win)
    // But also more variance
    const varianceFactor = 0.2 * Math.random() - 0.1; // -0.1 to +0.1 per expected win
    expectedWins *= (1 + varianceFactor);
    
    let call = Math.round(expectedWins);
    call = Math.max(0, Math.min(call, this.state.cardCount));
    
    // Check dealer restriction
    if (player.isDealer) {
      const totalCalled = this.state.players.reduce((sum, p) => sum + (p.call ?? 0), 0);
      const forbidden = this.state.cardCount - totalCalled;
      if (call === forbidden) {
        // Adjust call to avoid forbidden number - prefer going lower unless at 0
        if (expectedWins > forbidden) {
          call = forbidden + 1;
        } else {
          call = forbidden - 1;
        }
        call = Math.max(0, Math.min(call, this.state.cardCount));
      }
    }
    
    return call;
  }

  // CPU AI: Choose which card to play
  private generateCPUCardPlay(player: Player): Card {
    const hand = player.hand;
    const leadSuit = this.state.currentTrick.leadSuit;
    const trump = this.state.trump;
    
    // Get playable cards
    let playableCards: Card[];
    if (leadSuit) {
      const suitCards = hand.filter(c => c.suit === leadSuit);
      playableCards = suitCards.length > 0 ? suitCards : hand;
    } else {
      playableCards = hand;
    }
    
    // Determine strategy based on current trick winning status
    const currentTrickCards = this.state.currentTrick.cards;
    
    if (currentTrickCards.length === 0) {
      // Leading the trick - lead with a strong card if we need wins
      const tricksNeeded = (player.call ?? 0) - player.tricksWon;
      if (tricksNeeded > 0) {
        // Lead with a high card
        return playableCards.reduce((best, card) => {
          const bestValue = this.getCardStrength(best, trump);
          const cardValue = this.getCardStrength(card, trump);
          return cardValue > bestValue ? card : best;
        });
      } else {
        // Don't need more wins, play low
        return playableCards.reduce((lowest, card) => {
          const lowestValue = this.getCardStrength(lowest, trump);
          const cardValue = this.getCardStrength(card, trump);
          return cardValue < lowestValue ? card : lowest;
        });
      }
    } else {
      // Following - determine if we should try to win
      const tricksNeeded = (player.call ?? 0) - player.tricksWon;
      const currentWinningValue = this.getCurrentWinningValue();
      
      if (tricksNeeded > 0) {
        // Try to win - find a card that beats current winner
        const winningCard = playableCards.find(card => {
          const cardValue = this.getCardTrickValue(card, leadSuit!, trump);
          return cardValue > currentWinningValue;
        });
        
        if (winningCard) {
          return winningCard;
        }
      }
      
      // Can't/don't want to win - play lowest card
      return playableCards.reduce((lowest, card) => {
        const lowestValue = this.getCardStrength(lowest, trump);
        const cardValue = this.getCardStrength(card, trump);
        return cardValue < lowestValue ? card : lowest;
      });
    }
  }

  private getCardStrength(card: Card, trump: Suit | null): number {
    const baseValue = getRankValue(card.rank);
    if (trump && card.suit === trump) {
      return 100 + baseValue;
    }
    return baseValue;
  }

  private getCurrentWinningValue(): number {
    const { cards, leadSuit } = this.state.currentTrick;
    const trump = this.state.trump;
    
    if (cards.length === 0) return 0;
    
    let maxValue = 0;
    for (const { card } of cards) {
      const value = this.getCardTrickValue(card, leadSuit!, trump);
      if (value > maxValue) {
        maxValue = value;
      }
    }
    return maxValue;
  }

  // Process CPU turns automatically
  private processCPUTurns(): void {
    // Clear any existing timeout to prevent duplicates
    if (this.cpuProcessingTimeout) {
      clearTimeout(this.cpuProcessingTimeout);
      this.cpuProcessingTimeout = null;
    }

    if (this.state.phase !== "calling" && this.state.phase !== "playing") {
      return;
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isCPU) {
      return;
    }

    // Add delay to make CPU moves feel natural
    this.cpuProcessingTimeout = setTimeout(() => {
      this.cpuProcessingTimeout = null;
      
      // Re-check state is still valid (could have changed during timeout)
      if (this.state.phase !== "calling" && this.state.phase !== "playing") {
        return;
      }

      const actualCurrentPlayer = this.state.players[this.state.currentPlayerIndex];
      if (!actualCurrentPlayer || !actualCurrentPlayer.isCPU) {
        return;
      }

      if (this.state.phase === "calling") {
        const call = this.generateCPUCall(actualCurrentPlayer);
        this.makeCall(actualCurrentPlayer.id, call);
        this.notifyStateUpdate();
        this.processCPUTurns();
      } else if (this.state.phase === "playing") {
        // Double-check player has cards to play
        if (actualCurrentPlayer.hand.length === 0) {
          return;
        }
        const card = this.generateCPUCardPlay(actualCurrentPlayer);
        const trickWasComplete = this.state.currentTrick.cards.length === this.state.players.length - 1;
        this.playCard(actualCurrentPlayer.id, card);
        this.notifyStateUpdate();
        
        // Only continue processing if trick didn't just complete
        // (trick completion has its own timeout that calls processCPUTurns)
        if (!trickWasComplete && this.state.phase === "playing") {
          this.cpuProcessingTimeout = setTimeout(() => {
            this.cpuProcessingTimeout = null;
            this.processCPUTurns();
          }, 500);
        }
      }
    }, 1000 + Math.random() * 500); // 1-1.5 second delay
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

    // Trigger CPU processing if next player is CPU (for single player mode)
    if (this.state.isSinglePlayer && !player.isCPU) {
      this.notifyStateUpdate();
      this.processCPUTurns();
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
          this.notifyStateUpdate();
        }, 2000);
      } else {
        // Next trick
        setTimeout(() => {
          this.startNextTrick(winnerId);
          this.notifyStateUpdate();
          this.processCPUTurns();
        }, 2000);
      }
    } else {
      // Next player
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
      
      // Trigger CPU processing if next player is CPU (for single player mode)
      if (this.state.isSinglePlayer && !player.isCPU) {
        this.notifyStateUpdate();
        this.processCPUTurns();
      }
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
    this.notifyStateUpdate();
    this.processCPUTurns();
  }

  nextOlympicsGame(): void {
    if (!this.state.isOlympics || !this.state.olympicsState || !this.state.allOlympicsPlayers) return;
    if (this.state.phase !== "game_end") return;

    const olympics = this.state.olympicsState;
    
    // Get winner of current game (highest score)
    const sortedPlayers = [...this.state.players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];
    
    if (olympics.currentPhase === "groups") {
      // Mark current group as completed
      olympics.groups[olympics.currentGroupIndex].completed = true;
      olympics.groups[olympics.currentGroupIndex].winnerId = winner.id;
      olympics.finalsPlayerIds.push(winner.id);
      
      // Move to next group or finals
      if (olympics.currentGroupIndex < 6) {
        // Next group - this is watched by the human but they only play in group 0
        olympics.currentGroupIndex++;
        
        // Get players for next group
        const groupPlayerIds = olympics.groups[olympics.currentGroupIndex].playerIds;
        this.state.players = groupPlayerIds.map(id => 
          this.state.allOlympicsPlayers!.find(p => p.id === id)!
        ).map(p => ({
          ...p,
          hand: [],
          call: null,
          tricksWon: 0,
          score: 0,
          isDealer: false,
        }));
        
        // Reset game state for new group
        this.state.currentRound = 0;
        this.state.roundHistory = [];
        this.state.phase = "lobby";
        
        // Auto-start the game
        setTimeout(() => {
          this.startGame();
          this.notifyStateUpdate();
        }, 1000);
      } else {
        // All groups complete - move to finals
        olympics.currentPhase = "finals";
        
        // Get finalist players
        this.state.players = olympics.finalsPlayerIds.map(id => 
          this.state.allOlympicsPlayers!.find(p => p.id === id)!
        ).map(p => ({
          ...p,
          hand: [],
          call: null,
          tricksWon: 0,
          score: 0,
          isDealer: false,
        }));
        
        // Reset game state for finals
        this.state.currentRound = 0;
        this.state.roundHistory = [];
        this.state.phase = "lobby";
        
        // Auto-start the finals
        setTimeout(() => {
          this.startGame();
          this.notifyStateUpdate();
        }, 1000);
      }
    } else if (olympics.currentPhase === "finals") {
      // Finals complete - crown the champion!
      olympics.finalsCompleted = true;
      olympics.grandChampionId = winner.id;
      olympics.currentPhase = "complete";
    }
  }

  // Get state for a specific player (hide other players' hands)
  getStateForPlayer(playerId: string): GameState {
    const state = JSON.parse(JSON.stringify(this.state)) as GameState;

    // Hide other players' hands in playing phase (but show CPU hands in single player)
    if (state.phase === "playing" || state.phase === "calling") {
      for (const player of state.players) {
        if (player.id !== playerId && !this.state.isSinglePlayer) {
          player.hand = player.hand.map(() => ({ suit: "clubs" as Suit, rank: "2" as Rank }));
        }
        // In single player, hide CPU hands
        if (player.id !== playerId && player.isCPU) {
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
    const game = new Game(hostName, hostId, false, 0);
    this.games.set(game.state.id, game);
    this.playerGameMap.set(hostId, game.state.id);
    return game;
  }

  createSinglePlayerGame(hostName: string, hostId: string, cpuCount: number): Game {
    const game = new Game(hostName, hostId, true, cpuCount);
    this.games.set(game.state.id, game);
    this.playerGameMap.set(hostId, game.state.id);
    return game;
  }

  createOlympicsGame(hostName: string, hostId: string): Game {
    const game = new Game(hostName, hostId, true, 0);
    
    // Generate all 49 Olympics players
    const olympicsPlayers = generateOlympicsPlayers();
    
    // Pick one country for the human player (first one) and replace it
    const humanCountry = olympicsPlayers[0];
    
    // Create all 49 player objects
    const allPlayers: Player[] = olympicsPlayers.map((op, index) => {
      if (index === 0) {
        // Human player
        return {
          id: hostId,
          name: `${op.name.split(' ')[0]} ${hostName}`, // "Adjective PlayerName"
          hand: [],
          call: null,
          tricksWon: 0,
          score: 0,
          isDealer: false,
          isConnected: true,
          isCPU: false,
          countryCode: op.countryCode,
          countryName: op.countryName,
        };
      } else {
        return {
          id: randomUUID(),
          name: op.name,
          hand: [],
          call: null,
          tricksWon: 0,
          score: 0,
          isDealer: false,
          isConnected: true,
          isCPU: true,
          countryCode: op.countryCode,
          countryName: op.countryName,
        };
      }
    });
    
    // Create 7 groups of 7 players each
    const groups: OlympicsState['groups'] = [];
    for (let i = 0; i < 7; i++) {
      const groupPlayers = allPlayers.slice(i * 7, (i + 1) * 7);
      groups.push({
        groupNumber: i + 1,
        playerIds: groupPlayers.map(p => p.id),
        completed: false,
        winnerId: null,
      });
    }
    
    // Set up Olympics state
    game.state.isOlympics = true;
    game.state.allOlympicsPlayers = allPlayers;
    game.state.olympicsState = {
      currentGroupIndex: 0,
      groups,
      finalsPlayerIds: [],
      finalsCompleted: false,
      grandChampionId: null,
      currentPhase: "groups",
    };
    
    // Set current game players to first group (where human is)
    game.state.players = allPlayers.slice(0, 7);
    
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
