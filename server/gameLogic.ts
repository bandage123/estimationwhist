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
  GroupResult,
  GameFormat,
  KellerPlayerState,
  HaloMinigameState,
  BrucieBonusState,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { generateOlympicsPlayers, generateMatchReport, generateChampionQuote } from "@shared/olympicsData";

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
  private speedMultiplier: number = 1; // 0.25 = very fast, 0.5 = fast, 1 = normal, 2 = slow

  constructor(hostName: string, hostId: string, isSinglePlayer: boolean = false, cpuCount: number = 0, gameFormat: GameFormat = "traditional") {
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
      gameFormat,
    };

    // Add CPU players for single player mode
    if (isSinglePlayer && cpuCount > 0) {
      for (let i = 0; i < Math.min(cpuCount, 6); i++) {
        this.state.players.push(this.createPlayer(CPU_NAMES[i], randomUUID(), true));
      }
    }

    // Initialize Keller state if using Keller format
    if (gameFormat === "keller") {
      this.initializeKellerPlayerStates();
    }
  }

  // Initialize Keller-specific state for all players
  private initializeKellerPlayerStates(): void {
    this.state.kellerPlayerStates = {};
    for (const player of this.state.players) {
      this.state.kellerPlayerStates[player.id] = this.createKellerPlayerState();
    }
  }

  private createKellerPlayerState(): KellerPlayerState {
    return {
      consecutiveZeroCalls: 0,
      blindRoundsCompleted: 0,
      blindRoundsRemaining: 3,
      isInBlindMode: false,
      blindModeStartedRound: null,
      blindModeStartsNextRound: false,
      madeRoundOneBlindChoice: false,
      swapUsed: false,
      haloScore: null,
      brucieMultiplier: 2, // Default multiplier
    };
  }

  setOnStateUpdate(callback: StateUpdateCallback): void {
    this.onStateUpdate = callback;
  }

  setSpeed(speed: number): void {
    this.speedMultiplier = speed;
  }

  getSpeed(): number {
    return this.speedMultiplier;
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
      isBlindCalling: false,
    };
  }

  addPlayer(name: string, playerId: string): boolean {
    if (this.state.phase !== "lobby") return false;
    if (this.state.players.length >= 7) return false;
    if (this.state.players.some(p => p.name.toLowerCase() === name.toLowerCase())) return false;

    this.state.players.push(this.createPlayer(name, playerId, false));

    // Add Keller state for new player if in Keller format
    if (this.state.gameFormat === "keller" && this.state.kellerPlayerStates) {
      this.state.kellerPlayerStates[playerId] = this.createKellerPlayerState();
    }

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

  private determineDealerRound(tiedPlayerIndices?: number[]): void {
    // Ensure we're in the right phase
    if (this.state.phase !== "determining_dealer") {
      return;
    }

    const deck = shuffleDeck(createDeck());
    this.state.dealerCards = [];

    // If we have tied players from a previous round, only deal to them
    // Otherwise deal to all players
    const playersToCheck = tiedPlayerIndices || this.state.players.map((_, i) => i);

    // Deal one card to each player being checked
    for (let i = 0; i < playersToCheck.length; i++) {
      const playerIndex = playersToCheck[i];
      this.state.dealerCards.push({
        playerId: this.state.players[playerIndex].id,
        card: deck[i],
      });
    }

    // Find highest card(s) among the dealt cards
    let highestValue = 0;
    let highestPlayerIndices: number[] = [];

    for (let i = 0; i < this.state.dealerCards.length; i++) {
      const value = getRankValue(this.state.dealerCards[i].card.rank);
      // Map back to original player index
      const originalPlayerIndex = playersToCheck[i];
      if (value > highestValue) {
        highestValue = value;
        highestPlayerIndices = [originalPlayerIndex];
      } else if (value === highestValue) {
        highestPlayerIndices.push(originalPlayerIndex);
      }
    }

    if (highestPlayerIndices.length === 1) {
      // We have a winner
      this.state.dealerIndex = highestPlayerIndices[0];
      this.state.players.forEach((p, i) => {
        p.isDealer = i === this.state.dealerIndex;
      });

      // Notify state update so clients see the final dealer cards
      this.notifyStateUpdate();

      // Start the first round after a delay
      setTimeout(() => {
        // Re-check phase in case game was reset/cancelled
        if (this.state.phase === "determining_dealer") {
          this.startRound(1);
          this.notifyStateUpdate();
          this.processCPUTurns();
        }
      }, 3000 * this.speedMultiplier);
    } else {
      // Tie among highest cards - notify state update so clients see the tied cards
      this.notifyStateUpdate();

      // Deal again after delay, but only to the tied players
      setTimeout(() => {
        // Re-check phase in case game was reset/cancelled
        if (this.state.phase === "determining_dealer") {
          this.determineDealerRound(highestPlayerIndices);
        }
      }, 2000 * this.speedMultiplier);
    }
  }

  // Start blind rounds for a player (Keller format)
  // Start blind rounds from NEXT round (Keller format)
  // Player can choose during calling phase, but it takes effect from next round
  startBlindRounds(playerId: string): boolean {
    if (this.state.gameFormat !== "keller" || !this.state.kellerPlayerStates) return false;

    const kellerState = this.state.kellerPlayerStates[playerId];
    if (!kellerState) return false;

    // Can only start if not already in blind mode, not already queued, and haven't completed 3 blind rounds
    if (kellerState.isInBlindMode || kellerState.blindModeStartsNextRound || kellerState.blindRoundsCompleted >= 3) return false;

    // Set flag to activate blind mode from next round
    kellerState.blindModeStartsNextRound = true;

    this.notifyStateUpdate();
    return true;
  }

  // Start blind rounds immediately from round 1 (Keller format)
  // This is called when player chooses to go blind at the start of round 1
  startBlindRoundsNow(playerId: string): boolean {
    if (this.state.gameFormat !== "keller" || !this.state.kellerPlayerStates) return false;
    if (this.state.currentRound !== 1) return false; // Only valid for round 1
    if (this.state.phase !== "calling") return false;

    const kellerState = this.state.kellerPlayerStates[playerId];
    if (!kellerState) return false;

    // Can only use if haven't made the choice yet
    if (kellerState.madeRoundOneBlindChoice) return false;

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;

    // Activate blind mode immediately
    kellerState.isInBlindMode = true;
    kellerState.blindModeStartedRound = 1;
    kellerState.madeRoundOneBlindChoice = true;
    player.isBlindCalling = true;

    this.notifyStateUpdate();
    return true;
  }

  // Decline going blind from round 1 (Keller format)
  // Player will see their cards normally
  declineBlindRoundOne(playerId: string): boolean {
    if (this.state.gameFormat !== "keller" || !this.state.kellerPlayerStates) return false;
    if (this.state.currentRound !== 1) return false; // Only valid for round 1
    if (this.state.phase !== "calling") return false;

    const kellerState = this.state.kellerPlayerStates[playerId];
    if (!kellerState) return false;

    // Can only use if haven't made the choice yet
    if (kellerState.madeRoundOneBlindChoice) return false;

    // Just mark that they made the choice (declined)
    kellerState.madeRoundOneBlindChoice = true;

    this.notifyStateUpdate();
    return true;
  }

  // Use the One Swap One Time ability (Keller format)
  useSwap(playerId: string, cardToSwap: Card): boolean {
    if (this.state.gameFormat !== "keller" || !this.state.kellerPlayerStates) return false;
    if (this.state.phase !== "calling") return false;

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;

    // Can only swap on your turn
    if (this.state.players[this.state.currentPlayerIndex].id !== playerId) return false;

    const kellerState = this.state.kellerPlayerStates[playerId];
    if (!kellerState || kellerState.swapUsed) return false;

    // Check if card is in hand
    const cardIndex = player.hand.findIndex(
      c => c.suit === cardToSwap.suit && c.rank === cardToSwap.rank
    );
    if (cardIndex === -1) return false;

    // Check if there are cards in the swap deck
    if (!this.state.swapDeck || this.state.swapDeck.length === 0) return false;

    // Perform the swap
    const removedCard = player.hand.splice(cardIndex, 1)[0];
    const newCard = this.state.swapDeck.shift()!;
    player.hand.push(newCard);

    // Put the removed card at the end of the deck
    this.state.swapDeck.push(removedCard);

    // Re-sort hand
    player.hand.sort((a, b) => {
      const suitOrder: Record<Suit, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
      if (suitOrder[a.suit] !== suitOrder[b.suit]) {
        return suitOrder[a.suit] - suitOrder[b.suit];
      }
      return getRankValue(a.rank) - getRankValue(b.rank);
    });

    kellerState.swapUsed = true;
    this.notifyStateUpdate();
    return true;
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

    // Reset players for new round - create fresh empty arrays
    for (const p of this.state.players) {
      p.hand = [];
      p.call = null;
      p.tricksWon = 0;
      p.isBlindCalling = false;
    }

    // Deal cards from a fresh shuffled deck
    const deck = shuffleDeck(createDeck());
    let cardIndex = 0;
    for (let c = 0; c < this.state.cardCount; c++) {
      for (let p = 0; p < this.state.players.length; p++) {
        const card = deck[cardIndex++];
        this.state.players[p].hand.push(card);
      }
    }

    // Store remaining deck for swap functionality (Keller format)
    if (this.state.gameFormat === "keller") {
      this.state.swapDeck = deck.slice(cardIndex);
    }

    // VALIDATION: Check for duplicate cards across all hands
    const allDealtCards: string[] = [];
    for (const player of this.state.players) {
      for (const card of player.hand) {
        const cardKey = `${card.suit}-${card.rank}`;
        if (allDealtCards.includes(cardKey)) {
          console.error(`DUPLICATE CARD DETECTED: ${cardKey} in round ${roundNumber}`);
          console.error('All hands:', this.state.players.map(p => ({ name: p.name, hand: p.hand })));
        }
        allDealtCards.push(cardKey);
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

    // Handle Keller blind mode
    if (this.state.gameFormat === "keller" && this.state.kellerPlayerStates) {
      for (const player of this.state.players) {
        const kellerState = this.state.kellerPlayerStates[player.id];
        if (kellerState) {
          // Activate blind mode if player chose "Go Blind From Next Round" in previous round
          if (kellerState.blindModeStartsNextRound && !kellerState.isInBlindMode) {
            kellerState.isInBlindMode = true;
            kellerState.blindModeStartsNextRound = false;
            if (kellerState.blindModeStartedRound === null) {
              kellerState.blindModeStartedRound = roundNumber;
            }
          }

          // Auto-trigger blind mode for rounds 11-13 if not yet completed 3 blind rounds
          if (roundNumber >= 11 && kellerState.blindRoundsCompleted < 3 && !kellerState.isInBlindMode) {
            const roundsLeft = 13 - roundNumber + 1;
            const blindRoundsNeeded = 3 - kellerState.blindRoundsCompleted;
            if (roundsLeft <= blindRoundsNeeded) {
              kellerState.isInBlindMode = true;
              if (kellerState.blindModeStartedRound === null) {
                kellerState.blindModeStartedRound = roundNumber;
              }
            }
          }

          // Mark player as blind calling if in blind mode
          if (kellerState.isInBlindMode && kellerState.blindRoundsCompleted < 3) {
            player.isBlindCalling = true;
          }
        }
      }
    }

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

    // No3Z rule for Keller format - cannot call 0 three times in a row
    if (this.state.gameFormat === "keller" && this.state.kellerPlayerStates) {
      const kellerState = this.state.kellerPlayerStates[player.id];
      if (kellerState && kellerState.consecutiveZeroCalls >= 2 && call === 0) {
        call = 1; // Must call at least 1
      }
    }

    // Check dealer restriction
    if (player.isDealer) {
      const totalCalled = this.state.players.reduce((sum, p) => sum + (p.call ?? 0), 0);
      const forbidden = this.state.cardCount - totalCalled;
      if (call === forbidden && forbidden >= 0 && forbidden <= this.state.cardCount) {
        // Adjust call to avoid forbidden number
        // Try both directions and pick the valid one closest to expected wins
        const higher = forbidden + 1;
        const lower = forbidden - 1;

        // Check No3Z restriction when considering lower option
        const canCallZero = !(this.state.gameFormat === "keller" &&
          this.state.kellerPlayerStates &&
          this.state.kellerPlayerStates[player.id]?.consecutiveZeroCalls >= 2);
        const validLower = lower >= 0 && (lower !== 0 || canCallZero);
        const validHigher = higher <= this.state.cardCount;

        if (validHigher && validLower) {
          // Both directions valid, pick based on expected wins
          call = expectedWins >= forbidden ? higher : lower;
        } else if (validHigher) {
          call = higher;
        } else if (validLower) {
          call = lower;
        } else {
          // Neither is valid - this is an impossible situation
          // (e.g., 1-card round, forbidden=1, No3Z blocks 0)
          // In this case, No3Z must be broken - call 0
          call = 0;
        }
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
        // Keller format: CPU needs to make round 1 blind choice first
        if (this.state.gameFormat === "keller" && this.state.currentRound === 1 && this.state.kellerPlayerStates) {
          const cpuKellerState = this.state.kellerPlayerStates[actualCurrentPlayer.id];
          if (cpuKellerState && !cpuKellerState.madeRoundOneBlindChoice) {
            // CPU randomly decides to go blind from round 1 (30% chance)
            if (Math.random() < 0.3) {
              this.startBlindRoundsNow(actualCurrentPlayer.id);
            } else {
              this.declineBlindRoundOne(actualCurrentPlayer.id);
            }
            // Continue processing after a short delay
            this.cpuProcessingTimeout = setTimeout(() => {
              this.cpuProcessingTimeout = null;
              this.processCPUTurns();
            }, 500 * this.speedMultiplier);
            return;
          }
        }

        const call = this.generateCPUCall(actualCurrentPlayer);
        let result = this.makeCall(actualCurrentPlayer.id, call);
        if (!result.success) {
          // This shouldn't happen with the fixed generateCPUCall, but handle gracefully
          console.error(`CPU ${actualCurrentPlayer.name} failed to make call ${call}: ${result.error}, trying alternatives`);
          // Try all valid calls until one works
          for (let altCall = 0; altCall <= this.state.cardCount; altCall++) {
            result = this.makeCall(actualCurrentPlayer.id, altCall);
            if (result.success) {
              break;
            }
          }
        }
        // Only continue if a call was successfully made
        if (result.success) {
          // Note: makeCall already calls notifyStateUpdate internally
          this.processCPUTurns();
        } else {
          console.error(`CPU ${actualCurrentPlayer.name} could not make any valid call - game state may be invalid`);
        }
      } else if (this.state.phase === "playing") {
        // Double-check player has cards to play
        if (actualCurrentPlayer.hand.length === 0) {
          return;
        }
        const card = this.generateCPUCardPlay(actualCurrentPlayer);
        const trickWasComplete = this.state.currentTrick.cards.length === this.state.players.length - 1;
        const success = this.playCard(actualCurrentPlayer.id, card);
        if (!success) {
          console.error(`CPU ${actualCurrentPlayer.name} failed to play card`, card);
          return; // Don't continue if card play failed
        }

        // Only continue processing if trick didn't just complete
        // (trick completion has its own timeout that calls processCPUTurns)
        if (!trickWasComplete && this.state.phase === "playing") {
          this.cpuProcessingTimeout = setTimeout(() => {
            this.cpuProcessingTimeout = null;
            this.processCPUTurns();
          }, 500 * this.speedMultiplier);
        }
      }
    }, (1000 + Math.random() * 500) * this.speedMultiplier); // 1-1.5 second delay, scaled by speed
  }

  makeCall(playerId: string, call: number): { success: boolean; error?: string } {
    if (this.state.phase !== "calling") {
      console.log(`makeCall rejected: phase is ${this.state.phase}, not "calling"`);
      return { success: false, error: `Cannot make call - game phase is "${this.state.phase}", not "calling"` };
    }

    const player = this.state.players[this.state.currentPlayerIndex];
    if (player.id !== playerId) {
      console.log(`makeCall rejected: current player is ${player.id} (${player.name}), not ${playerId}`);
      return { success: false, error: `It's not your turn to call (current: ${player.name})` };
    }

    // Validate call
    if (call < 0 || call > this.state.cardCount) {
      return { success: false, error: `Invalid call value: ${call} (must be 0-${this.state.cardCount})` };
    }

    // Calculate dealer restriction
    let forbidden: number | null = null;
    if (player.isDealer) {
      const totalCalled = this.state.players.reduce((sum, p) => sum + (p.call ?? 0), 0);
      forbidden = this.state.cardCount - totalCalled;
      if (call === forbidden) {
        return { success: false, error: `As dealer, you cannot call ${forbidden} (total would equal card count)` };
      }
    }

    // No3Z rule for Keller format
    // Exception: if dealer and the only valid call would be 0 (forbidden is the only other option)
    if (this.state.gameFormat === "keller" && this.state.kellerPlayerStates) {
      const kellerState = this.state.kellerPlayerStates[playerId];
      if (kellerState && call === 0 && kellerState.consecutiveZeroCalls >= 2) {
        // Check if this is an impossible situation for the dealer
        // where they can't call anything else
        if (player.isDealer && forbidden !== null) {
          // Dealer can't call 'forbidden'. Check if all other options are blocked by No3Z
          // On a 1-card round: options are 0 and 1. If forbidden=1, only 0 is available.
          // Allow the call in this impossible situation.
          let hasValidAlternative = false;
          for (let alt = 0; alt <= this.state.cardCount; alt++) {
            if (alt !== forbidden && alt !== 0) {
              hasValidAlternative = true;
              break;
            }
          }
          if (!hasValidAlternative) {
            // No valid alternative exists - allow breaking No3Z to avoid stuck game
            // (This can happen on 1-card rounds where forbidden=1 and No3Z blocks 0)
          } else {
            return { success: false, error: "No3Z rule: Cannot call 0 three times in a row" };
          }
        } else {
          return { success: false, error: "No3Z rule: Cannot call 0 three times in a row" };
        }
      }
    }

    player.call = call;

    // Update consecutive zero calls tracking for Keller format
    if (this.state.gameFormat === "keller" && this.state.kellerPlayerStates) {
      const kellerState = this.state.kellerPlayerStates[playerId];
      if (kellerState) {
        if (call === 0) {
          kellerState.consecutiveZeroCalls++;
        } else {
          kellerState.consecutiveZeroCalls = 0;
        }
      }
    }

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

    // Notify state update
    this.notifyStateUpdate();

    // Note: processCPUTurns is called by the caller (either wsHandler for human plays,
    // or processCPUTurns itself for CPU chains). We don't call it here to avoid duplicate calls.

    return { success: true };
  }

  // Public method to trigger CPU processing - called by wsHandler after human actions
  triggerCPUProcessingIfNeeded(): void {
    if (!this.state.isSinglePlayer && !this.state.isOlympics) {
      return;
    }
    const nextPlayer = this.state.players[this.state.currentPlayerIndex];
    if (nextPlayer?.isCPU) {
      this.processCPUTurns();
    }
  }

  // Trigger CPU processing for a disconnected player who is now CPU-controlled
  triggerCPUProcessingForDisconnectedPlayer(): void {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (currentPlayer?.isCPUControlled) {
      this.processCPUControlledTurn();
    }
  }

  // Process a turn for a CPU-controlled (disconnected) human player
  private processCPUControlledTurn(): void {
    if (this.state.phase !== "calling" && this.state.phase !== "playing") {
      return;
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isCPUControlled) {
      return;
    }

    // Use the same CPU logic as regular CPU players
    setTimeout(() => {
      // Re-check state is still valid
      const actualCurrentPlayer = this.state.players[this.state.currentPlayerIndex];
      if (!actualCurrentPlayer || !actualCurrentPlayer.isCPUControlled) {
        return;
      }

      if (this.state.phase === "calling") {
        const call = this.generateCPUCall(actualCurrentPlayer);
        const result = this.makeCall(actualCurrentPlayer.id, call);
        if (!result.success) {
          // Try alternatives
          for (let altCall = 0; altCall <= this.state.cardCount; altCall++) {
            const altResult = this.makeCall(actualCurrentPlayer.id, altCall);
            if (altResult.success) break;
          }
        }
        // Continue processing if next player is also CPU or CPU-controlled
        this.triggerNextCPUOrControlledTurn();
      } else if (this.state.phase === "playing") {
        if (actualCurrentPlayer.hand.length === 0) return;
        const card = this.generateCPUCardPlay(actualCurrentPlayer);
        const trickWasComplete = this.state.currentTrick.cards.length === this.state.players.length - 1;
        const success = this.playCard(actualCurrentPlayer.id, card);
        if (success && !trickWasComplete && this.state.phase === "playing") {
          setTimeout(() => {
            this.triggerNextCPUOrControlledTurn();
          }, 500 * this.speedMultiplier);
        }
      }
    }, (1000 + Math.random() * 500) * this.speedMultiplier);
  }

  // Check if next player needs CPU processing (either actual CPU or CPU-controlled)
  private triggerNextCPUOrControlledTurn(): void {
    const nextPlayer = this.state.players[this.state.currentPlayerIndex];
    if (nextPlayer?.isCPU) {
      this.processCPUTurns();
    } else if (nextPlayer?.isCPUControlled) {
      this.processCPUControlledTurn();
    }
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

    // VALIDATION: Check if this card has already been played in this trick
    const alreadyPlayed = this.state.currentTrick.cards.some(
      c => c.card.suit === card.suit && c.card.rank === card.rank
    );
    if (alreadyPlayed) {
      console.error(`DUPLICATE CARD IN TRICK: ${card.suit} ${card.rank} played by ${player.name}`);
      console.error('Current trick:', this.state.currentTrick.cards);
      console.error('All hands:', this.state.players.map(p => ({ name: p.name, hand: p.hand })));
      return false;
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

      // IMPORTANT: Notify state update NOW so clients see the last card played
      this.notifyStateUpdate();

      // Check if round is complete
      if (this.state.trickNumber >= this.state.cardCount) {
        // Round is over
        setTimeout(() => {
          this.endRound();
          this.notifyStateUpdate();
        }, 2000 * this.speedMultiplier);
      } else {
        // Next trick
        setTimeout(() => {
          this.startNextTrick(winnerId);
          this.notifyStateUpdate();
          this.processCPUTurns();
        }, 2000 * this.speedMultiplier);
      }
    } else {
      // Next player
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
      
      // Notify state update
      this.notifyStateUpdate();
      
      // Note: processCPUTurns is called by the caller (either wsHandler for human plays, 
      // or processCPUTurns itself for CPU chains). We don't call it here to avoid duplicate calls.
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

      // Keller format: Apply Brucie multiplier on round 13
      if (this.state.gameFormat === "keller" && this.state.kellerPlayerStates && this.state.currentRound === 13) {
        const kellerState = this.state.kellerPlayerStates[player.id];
        if (kellerState) {
          roundScore *= kellerState.brucieMultiplier;
        }
      }

      player.score += roundScore;

      roundResult.playerResults.push({
        playerId: player.id,
        playerName: player.name,
        call: player.call,
        tricksWon: player.tricksWon,
        roundScore,
      });

      // Keller format: Track blind round completion
      if (this.state.gameFormat === "keller" && this.state.kellerPlayerStates) {
        const kellerState = this.state.kellerPlayerStates[player.id];
        if (kellerState && player.isBlindCalling) {
          kellerState.blindRoundsCompleted++;
          kellerState.blindRoundsRemaining = 3 - kellerState.blindRoundsCompleted;
          if (kellerState.blindRoundsCompleted >= 3) {
            kellerState.isInBlindMode = false;
          }
        }
        // Reset isBlindCalling for next round
        player.isBlindCalling = false;
      }
    }

    // Keller format: Add Halo scores after round 8 ends
    if (this.state.gameFormat === "keller" && this.state.kellerPlayerStates && this.state.currentRound === 8) {
      for (const player of this.state.players) {
        const kellerState = this.state.kellerPlayerStates[player.id];
        if (kellerState && kellerState.haloScore !== null) {
          player.score += kellerState.haloScore;
        }
      }
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

    // Keller format: Trigger minigames at specific rounds
    if (this.state.gameFormat === "keller") {
      // After round 7, trigger Halo minigame
      if (this.state.currentRound === 7) {
        this.startHaloMinigame();
        return;
      }
      // After round 12, trigger Brucie Bonus
      if (this.state.currentRound === 12) {
        this.startBrucieBonus();
        return;
      }
    }

    this.proceedToNextRound();
  }

  private proceedToNextRound(): void {
    // Move dealer to next player
    this.state.players.forEach(p => p.isDealer = false);
    this.state.dealerIndex = (this.state.dealerIndex + 1) % this.state.players.length;
    this.state.players[this.state.dealerIndex].isDealer = true;

    // Start next round
    this.startRound(this.state.currentRound + 1);
    this.notifyStateUpdate();
    this.processCPUTurns();
  }

  // ==================== HALO MINIGAME (Keller format) ====================

  private startHaloMinigame(): void {
    if (this.state.gameFormat !== "keller") return;

    // Initialize Halo state
    this.state.haloMinigame = {
      currentPlayerId: this.state.players[0].id,
      currentCard: this.drawRandomCard(),
      correctGuesses: 0,
      isComplete: false,
      playerResults: [],
      lastResult: null,
      waitingForContinue: false,
    };

    this.state.phase = "halo_minigame";
    this.notifyStateUpdate();

    // Process CPU if first player is CPU
    this.processHaloCPU();
  }

  private drawRandomCard(): Card {
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    return { suit, rank };
  }

  haloGuess(playerId: string, guess: "higher" | "lower" | "same"): boolean {
    if (this.state.phase !== "halo_minigame" || !this.state.haloMinigame) return false;
    if (this.state.haloMinigame.currentPlayerId !== playerId) return false;
    if (!this.state.haloMinigame.currentCard) return false;
    if (this.state.haloMinigame.waitingForContinue) return false;

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;

    const previousCard = this.state.haloMinigame.currentCard;
    const currentValue = getRankValue(previousCard.rank);
    const nextCard = this.drawRandomCard();
    const nextValue = getRankValue(nextCard.rank);

    let correct = false;
    if (guess === "higher" && nextValue > currentValue) correct = true;
    if (guess === "lower" && nextValue < currentValue) correct = true;
    if (guess === "same" && nextValue === currentValue) correct = true;

    if (correct) {
      this.state.haloMinigame.correctGuesses++;
      const newCorrectGuesses = this.state.haloMinigame.correctGuesses;

      // Check if max reached
      if (newCorrectGuesses >= 7) {
        const score = 49; // 7^2
        // Set result showing they maxed out
        this.state.haloMinigame.lastResult = {
          playerId,
          playerName: player.name,
          guess,
          previousCard,
          newCard: nextCard,
          wasCorrect: true,
          correctGuesses: newCorrectGuesses,
          finalScore: score,
        };
        this.state.haloMinigame.waitingForContinue = true;
        this.state.haloMinigame.currentCard = nextCard;
        // Don't complete yet - wait for acknowledge
      } else {
        // Correct but not maxed - show result and wait
        this.state.haloMinigame.lastResult = {
          playerId,
          playerName: player.name,
          guess,
          previousCard,
          newCard: nextCard,
          wasCorrect: true,
          correctGuesses: newCorrectGuesses,
          finalScore: null,  // Still playing
        };
        this.state.haloMinigame.waitingForContinue = true;
        this.state.haloMinigame.currentCard = nextCard;
      }
    } else {
      // Wrong guess - show result, player busted
      this.state.haloMinigame.lastResult = {
        playerId,
        playerName: player.name,
        guess,
        previousCard,
        newCard: nextCard,
        wasCorrect: false,
        correctGuesses: this.state.haloMinigame.correctGuesses,
        finalScore: 0,
      };
      this.state.haloMinigame.waitingForContinue = true;
    }

    this.notifyStateUpdate();
    return true;
  }

  haloBank(playerId: string): boolean {
    if (this.state.phase !== "halo_minigame" || !this.state.haloMinigame) return false;
    if (this.state.haloMinigame.currentPlayerId !== playerId) return false;
    if (this.state.haloMinigame.waitingForContinue) return false;

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;

    const score = this.state.haloMinigame.correctGuesses ** 2;
    const currentCard = this.state.haloMinigame.currentCard!;

    // Set result showing they banked
    this.state.haloMinigame.lastResult = {
      playerId,
      playerName: player.name,
      guess: "bank",
      previousCard: currentCard,
      newCard: null,
      wasCorrect: null,
      correctGuesses: this.state.haloMinigame.correctGuesses,
      finalScore: score,
    };
    this.state.haloMinigame.waitingForContinue = true;

    this.notifyStateUpdate();
    return true;
  }

  haloContinue(): boolean {
    if (this.state.phase !== "halo_minigame" || !this.state.haloMinigame) {
      console.log(`haloContinue rejected: phase=${this.state.phase}, haloMinigame exists=${!!this.state.haloMinigame}`);
      return false;
    }
    if (!this.state.haloMinigame.isComplete) {
      console.log("haloContinue rejected: Halo not complete");
      return false;
    }

    console.log(`haloContinue: transitioning from round ${this.state.currentRound} to ${this.state.currentRound + 1}`);

    // Clear Halo state and proceed to next round
    // Note: Halo scores are added at the end of round 8 in endRound()
    this.state.haloMinigame = undefined;
    this.proceedToNextRound();

    console.log(`haloContinue complete: phase=${this.state.phase}, round=${this.state.currentRound}, currentPlayerIndex=${this.state.currentPlayerIndex}, currentPlayer=${this.state.players[this.state.currentPlayerIndex]?.name}`);
    return true;
  }

  // Called when user acknowledges seeing a result
  haloAcknowledge(): boolean {
    if (this.state.phase !== "halo_minigame" || !this.state.haloMinigame) return false;
    if (!this.state.haloMinigame.waitingForContinue || !this.state.haloMinigame.lastResult) return false;

    const result = this.state.haloMinigame.lastResult;
    const playerId = result.playerId;

    // Clear the result
    this.state.haloMinigame.lastResult = null;
    this.state.haloMinigame.waitingForContinue = false;

    // If player finished (has finalScore), complete them and move to next
    if (result.finalScore !== null) {
      this.completeHaloForPlayer(playerId, result.finalScore);
    } else {
      // Player continues - if CPU, trigger next guess
      this.notifyStateUpdate();
      this.processHaloCPU();
    }

    return true;
  }

  private completeHaloForPlayer(playerId: string, score: number): void {
    if (!this.state.haloMinigame || !this.state.kellerPlayerStates) return;

    // Store result
    this.state.haloMinigame.playerResults.push({ playerId, score });

    // Update keller state
    const kellerState = this.state.kellerPlayerStates[playerId];
    if (kellerState) {
      kellerState.haloScore = score;
    }

    // Move to next player
    const currentIdx = this.state.players.findIndex(p => p.id === playerId);
    const nextIdx = currentIdx + 1;

    if (nextIdx >= this.state.players.length) {
      // All players finished - wait for user to click continue
      this.state.haloMinigame.isComplete = true;
      this.state.haloMinigame.currentPlayerId = null;
      this.state.haloMinigame.currentCard = null;
      this.notifyStateUpdate();
    } else {
      // Next player
      this.state.haloMinigame.currentPlayerId = this.state.players[nextIdx].id;
      this.state.haloMinigame.currentCard = this.drawRandomCard();
      this.state.haloMinigame.correctGuesses = 0;
      this.notifyStateUpdate();
      this.processHaloCPU();
    }
  }

  private processHaloCPU(): void {
    if (this.state.phase !== "halo_minigame" || !this.state.haloMinigame) return;

    const currentPlayer = this.state.players.find(p => p.id === this.state.haloMinigame?.currentPlayerId);
    if (!currentPlayer || !currentPlayer.isCPU) return;

    // CPU Halo strategy: 60% chance to guess, 40% to bank (if any correct)
    const makeGuess = () => {
      if (!this.state.haloMinigame || !this.state.haloMinigame.currentCard) return;

      const correctGuesses = this.state.haloMinigame.correctGuesses;
      const currentValue = getRankValue(this.state.haloMinigame.currentCard.rank);

      // Higher chance to bank with more correct guesses
      const bankProbability = Math.min(0.2 + (correctGuesses * 0.15), 0.8);
      if (correctGuesses > 0 && Math.random() < bankProbability) {
        this.haloBank(currentPlayer.id);
        return;
      }

      // Decide guess based on current card value
      let guess: "higher" | "lower" | "same";
      if (currentValue <= 4) {
        guess = "higher";
      } else if (currentValue >= 12) {
        guess = "lower";
      } else if (currentValue === 8 && Math.random() < 0.1) {
        guess = "same";
      } else {
        guess = Math.random() < 0.5 ? "higher" : "lower";
      }

      this.haloGuess(currentPlayer.id, guess);
    };

    // Minigames always use 1x speed for dramatic effect
    setTimeout(makeGuess, 800 + Math.random() * 400);
  }

  // ==================== BRUCIE BONUS (Keller format) ====================

  private startBrucieBonus(): void {
    if (this.state.gameFormat !== "keller") return;

    // Initialize Brucie state
    this.state.brucieBonus = {
      currentPlayerId: this.state.players[0].id,
      currentCard: this.drawRandomCard(),
      correctGuesses: 0,
      isComplete: false,
      playerMultipliers: [],
      lastResult: null,
      waitingForContinue: false,
    };

    this.state.phase = "brucie_bonus";
    this.notifyStateUpdate();

    // Process CPU if first player is CPU
    this.processBrucieCPU();
  }

  brucieGuess(playerId: string, guess: "higher" | "lower"): boolean {
    if (this.state.phase !== "brucie_bonus" || !this.state.brucieBonus) return false;
    if (this.state.brucieBonus.currentPlayerId !== playerId) return false;
    if (!this.state.brucieBonus.currentCard) return false;
    if (this.state.brucieBonus.waitingForContinue) return false;

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;

    const previousCard = this.state.brucieBonus.currentCard;
    const currentValue = getRankValue(previousCard.rank);
    const nextCard = this.drawRandomCard();
    const nextValue = getRankValue(nextCard.rank);

    let correct = false;
    if (guess === "higher" && nextValue > currentValue) correct = true;
    if (guess === "lower" && nextValue < currentValue) correct = true;
    // Same value counts as wrong for Brucie

    if (correct) {
      this.state.brucieBonus.correctGuesses++;
      const newCorrectGuesses = this.state.brucieBonus.correctGuesses;
      this.state.brucieBonus.currentCard = nextCard;

      // Max 3 correct guesses = 3x multiplier
      if (newCorrectGuesses >= 3) {
        // Set result showing they maxed out
        this.state.brucieBonus.lastResult = {
          playerId,
          playerName: player.name,
          guess,
          previousCard,
          newCard: nextCard,
          wasCorrect: true,
          correctGuesses: newCorrectGuesses,
          finalScore: 3, // 3x multiplier
        };
        this.state.brucieBonus.waitingForContinue = true;
      } else {
        // Correct but not maxed - show result and wait
        this.state.brucieBonus.lastResult = {
          playerId,
          playerName: player.name,
          guess,
          previousCard,
          newCard: nextCard,
          wasCorrect: true,
          correctGuesses: newCorrectGuesses,
          finalScore: null, // Still playing
        };
        this.state.brucieBonus.waitingForContinue = true;
      }
    } else {
      // Wrong guess - show result, multiplier is 1x
      this.state.brucieBonus.lastResult = {
        playerId,
        playerName: player.name,
        guess,
        previousCard,
        newCard: nextCard,
        wasCorrect: false,
        correctGuesses: this.state.brucieBonus.correctGuesses,
        finalScore: 1, // 1x multiplier (busted)
      };
      this.state.brucieBonus.waitingForContinue = true;
    }

    this.notifyStateUpdate();
    return true;
  }

  brucieBank(playerId: string): boolean {
    if (this.state.phase !== "brucie_bonus" || !this.state.brucieBonus) return false;
    if (this.state.brucieBonus.currentPlayerId !== playerId) return false;
    if (this.state.brucieBonus.waitingForContinue) return false;

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;

    // Multiplier: banking gives current correct + 2 (min 2, max 3)
    const multiplier = Math.min(this.state.brucieBonus.correctGuesses + 2, 3);
    const currentCard = this.state.brucieBonus.currentCard!;

    // Set result showing they banked
    this.state.brucieBonus.lastResult = {
      playerId,
      playerName: player.name,
      guess: "bank",
      previousCard: currentCard,
      newCard: null,
      wasCorrect: null,
      correctGuesses: this.state.brucieBonus.correctGuesses,
      finalScore: multiplier,
    };
    this.state.brucieBonus.waitingForContinue = true;

    this.notifyStateUpdate();
    return true;
  }

  skipBrucie(playerId: string): boolean {
    if (this.state.phase !== "brucie_bonus" || !this.state.brucieBonus) return false;
    if (this.state.brucieBonus.currentPlayerId !== playerId) return false;
    if (this.state.brucieBonus.correctGuesses > 0) return false; // Can only skip before playing
    if (this.state.brucieBonus.waitingForContinue) return false;

    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;

    const currentCard = this.state.brucieBonus.currentCard!;

    // Set result showing they skipped
    this.state.brucieBonus.lastResult = {
      playerId,
      playerName: player.name,
      guess: "skip",
      previousCard: currentCard,
      newCard: null,
      wasCorrect: null,
      correctGuesses: 0,
      finalScore: 2, // Skip gives 2x
    };
    this.state.brucieBonus.waitingForContinue = true;

    this.notifyStateUpdate();
    return true;
  }

  private completeBrucieForPlayer(playerId: string, multiplier: number): void {
    if (!this.state.brucieBonus || !this.state.kellerPlayerStates) return;

    // Store result
    this.state.brucieBonus.playerMultipliers.push({ playerId, multiplier });

    // Update keller state
    const kellerState = this.state.kellerPlayerStates[playerId];
    if (kellerState) {
      kellerState.brucieMultiplier = multiplier;
    }

    // Move to next player
    const currentIdx = this.state.players.findIndex(p => p.id === playerId);
    const nextIdx = currentIdx + 1;

    if (nextIdx >= this.state.players.length) {
      // All players finished - wait for user to click continue
      this.state.brucieBonus.isComplete = true;
      this.state.brucieBonus.currentPlayerId = null;
      this.state.brucieBonus.currentCard = null;
      this.notifyStateUpdate();
    } else {
      // Next player
      this.state.brucieBonus.currentPlayerId = this.state.players[nextIdx].id;
      this.state.brucieBonus.currentCard = this.drawRandomCard();
      this.state.brucieBonus.correctGuesses = 0;
      this.notifyStateUpdate();
      this.processBrucieCPU();
    }
  }

  brucieContinue(): boolean {
    if (this.state.phase !== "brucie_bonus" || !this.state.brucieBonus) return false;
    if (!this.state.brucieBonus.isComplete) return false;

    // Clear Brucie state and proceed to next round
    this.state.brucieBonus = undefined;
    this.proceedToNextRound();
    return true;
  }

  // Called when user acknowledges seeing a Brucie result
  brucieAcknowledge(): boolean {
    if (this.state.phase !== "brucie_bonus" || !this.state.brucieBonus) return false;
    if (!this.state.brucieBonus.waitingForContinue || !this.state.brucieBonus.lastResult) return false;

    const result = this.state.brucieBonus.lastResult;
    const playerId = result.playerId;

    // Clear the result
    this.state.brucieBonus.lastResult = null;
    this.state.brucieBonus.waitingForContinue = false;

    // If player finished (has finalScore), complete them and move to next
    if (result.finalScore !== null) {
      this.completeBrucieForPlayer(playerId, result.finalScore);
    } else {
      // Player continues - if CPU, trigger next guess
      this.notifyStateUpdate();
      this.processBrucieCPU();
    }

    return true;
  }

  private processBrucieCPU(): void {
    if (this.state.phase !== "brucie_bonus" || !this.state.brucieBonus) return;

    const currentPlayer = this.state.players.find(p => p.id === this.state.brucieBonus?.currentPlayerId);
    if (!currentPlayer || !currentPlayer.isCPU) return;

    const makeGuess = () => {
      if (!this.state.brucieBonus || !this.state.brucieBonus.currentCard) return;

      const correctGuesses = this.state.brucieBonus.correctGuesses;
      const currentValue = getRankValue(this.state.brucieBonus.currentCard.rank);

      // CPU always plays (doesn't skip) for potential higher multiplier
      // Bank probability increases with correct guesses
      const bankProbability = correctGuesses * 0.35;
      if (correctGuesses > 0 && Math.random() < bankProbability) {
        this.brucieBank(currentPlayer.id);
        return;
      }

      // Decide guess based on current card value
      const guess: "higher" | "lower" = currentValue <= 7 ? "higher" : "lower";
      this.brucieGuess(currentPlayer.id, guess);
    };

    // Minigames always use 1x speed for dramatic effect
    setTimeout(makeGuess, 800 + Math.random() * 400);
  }

  // Start the Olympics qualifying round - human plays Group 1, others simulated
  startOlympicsQualifying(): void {
    if (!this.state.isOlympics || !this.state.olympicsState) return;
    if (this.state.olympicsState.currentPhase !== "draws") return;
    
    const olympics = this.state.olympicsState;
    olympics.currentPhase = "qualifying";
    
    // Simulate groups 2-7 in the background while human plays group 1
    this.simulateOtherGroups();
    
    // Start human's game (group 1)
    this.startGame();
  }
  
  // Simulate groups 2-7 concurrently
  private simulateOtherGroups(): void {
    if (!this.state.olympicsState || !this.state.allOlympicsPlayers) return;
    
    // Simulate groups 2-7 (indices 1-6)
    for (let groupIdx = 1; groupIdx < 7; groupIdx++) {
      const group = this.state.olympicsState.groups[groupIdx];
      const groupPlayers = group.playerIds.map(id => 
        this.state.allOlympicsPlayers!.find(p => p.id === id)!
      );
      
      // Simulate a full game for this group
      const result = this.simulateFullGame(groupPlayers);
      
      // Store results
      group.completed = true;
      group.winnerId = result.winnerId;
      group.finalScores = result.scores;
      
      // Generate match report
      const sortedScores = [...result.scores].sort((a, b) => b.score - a.score);
      const winner = groupPlayers.find(p => p.id === sortedScores[0].playerId)!;
      const runnerUp = groupPlayers.find(p => p.id === sortedScores[1].playerId)!;
      
      group.matchReport = generateMatchReport(
        winner.name,
        runnerUp.name,
        sortedScores[0].score,
        sortedScores[1].score,
        group.groupNumber
      );
      
      // Add winner to finals
      this.state.olympicsState.finalsPlayerIds.push(result.winnerId);
    }
  }
  
  // Calculate a call for simulation (static version without this.state dependency)
  private simulateCPUCall(hand: Card[], trump: Suit | null, numPlayers: number): number {
    const suitCounts: Record<Suit, number> = { clubs: 0, diamonds: 0, hearts: 0, spades: 0 };
    for (const card of hand) {
      suitCounts[card.suit]++;
    }
    
    let expectedWins = 0;
    
    for (const card of hand) {
      const value = getRankValue(card.rank);
      const isInTrump = trump && card.suit === trump;
      
      if (isInTrump) {
        if (value === 14) expectedWins += 0.95;
        else if (value === 13) expectedWins += 0.85;
        else if (value === 12) expectedWins += 0.70;
        else if (value >= 10) expectedWins += 0.50;
        else expectedWins += 0.30;
      } else {
        if (value === 14) expectedWins += 0.80 / Math.sqrt(numPlayers / 2);
        else if (value === 13) expectedWins += 0.55 / Math.sqrt(numPlayers / 2);
        else if (value === 12) expectedWins += 0.35 / Math.sqrt(numPlayers / 2);
        else if (value >= 10) expectedWins += 0.15 / Math.sqrt(numPlayers / 2);
      }
    }
    
    return Math.round(expectedWins);
  }

  // Simulate a complete 13-round game and return results
  private simulateFullGame(players: Player[]): { winnerId: string; scores: { playerId: string; score: number }[] } {
    // Create temporary player states
    const gamePlayers = players.map(p => ({
      ...p,
      hand: [] as Card[],
      call: null as number | null,
      tricksWon: 0,
      score: 0,
    }));
    
    // Play all 13 rounds
    for (let roundNum = 1; roundNum <= 13; roundNum++) {
      const config = roundConfigs[roundNum - 1];
      
      // Deal cards
      const deck = this.createAndShuffleDeck();
      for (let i = 0; i < gamePlayers.length; i++) {
        gamePlayers[i].hand = deck.slice(i * config.cardCount, (i + 1) * config.cardCount);
        gamePlayers[i].call = null;
        gamePlayers[i].tricksWon = 0;
      }
      
      // Make calls for all players
      let totalCalls = 0;
      const dealerIdx = roundNum % gamePlayers.length;
      
      for (let i = 0; i < gamePlayers.length; i++) {
        const playerIdx = (dealerIdx + 1 + i) % gamePlayers.length;
        const player = gamePlayers[playerIdx];
        const isDealer = playerIdx === dealerIdx;
        
        let call = this.simulateCPUCall(player.hand, config.trump, gamePlayers.length);
        
        // Dealer restriction
        if (isDealer) {
          const forbidden = config.cardCount - totalCalls;
          if (call === forbidden) {
            call = call > 0 ? call - 1 : call + 1;
          }
        }
        
        call = Math.max(0, Math.min(call, config.cardCount));
        player.call = call;
        totalCalls += call;
      }
      
      // Play all tricks
      let leadPlayerIdx = (dealerIdx + 1) % gamePlayers.length;
      
      for (let trick = 0; trick < config.cardCount; trick++) {
        const trickCards: { playerIdx: number; card: Card }[] = [];
        let leadSuit: Suit | null = null;
        
        for (let i = 0; i < gamePlayers.length; i++) {
          const playerIdx = (leadPlayerIdx + i) % gamePlayers.length;
          const player = gamePlayers[playerIdx];
          
          // Pick card to play
          const card = this.pickCPUCard(player, leadSuit, config.trump);
          if (i === 0) leadSuit = card.suit;
          
          trickCards.push({ playerIdx, card });
          player.hand = player.hand.filter(c => !(c.suit === card.suit && c.rank === card.rank));
        }
        
        // Determine winner
        const winnerIdx = this.simulateTrickWinner(trickCards, leadSuit!, config.trump);
        gamePlayers[winnerIdx].tricksWon++;
        leadPlayerIdx = winnerIdx;
      }
      
      // Calculate scores
      for (const player of gamePlayers) {
        let roundScore = 0;
        if (player.call !== null) {
          if (player.tricksWon === player.call) {
            roundScore = 10 + player.tricksWon;
          } else if (player.tricksWon > player.call) {
            roundScore = player.tricksWon;
          }
        }
        if (config.doublePoints) roundScore *= 2;
        player.score += roundScore;
      }
    }
    
    // Find winner
    const sortedPlayers = [...gamePlayers].sort((a, b) => b.score - a.score);
    
    return {
      winnerId: sortedPlayers[0].id,
      scores: gamePlayers.map(p => ({ playerId: p.id, score: p.score })),
    };
  }
  
  private createAndShuffleDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }
  
  private simulateTrickWinner(cards: { playerIdx: number; card: Card }[], leadSuit: Suit, trump: Suit | null): number {
    let winningIdx = 0;
    let winningCard = cards[0].card;
    
    for (let i = 1; i < cards.length; i++) {
      const card = cards[i].card;
      const isWinningTrump = trump && winningCard.suit === trump;
      const isCurrentTrump = trump && card.suit === trump;
      
      if (isCurrentTrump && !isWinningTrump) {
        winningIdx = i;
        winningCard = card;
      } else if (isCurrentTrump && isWinningTrump) {
        if (getRankValue(card.rank) > getRankValue(winningCard.rank)) {
          winningIdx = i;
          winningCard = card;
        }
      } else if (!isCurrentTrump && !isWinningTrump) {
        if (card.suit === leadSuit && winningCard.suit === leadSuit) {
          if (getRankValue(card.rank) > getRankValue(winningCard.rank)) {
            winningIdx = i;
            winningCard = card;
          }
        } else if (card.suit === leadSuit) {
          winningIdx = i;
          winningCard = card;
        }
      }
    }
    
    return cards[winningIdx].playerIdx;
  }
  
  private pickCPUCard(player: { hand: Card[]; call: number | null; tricksWon: number }, leadSuit: Suit | null, trump: Suit | null): Card {
    const hand = player.hand;
    if (hand.length === 0) throw new Error("No cards to play");
    
    // Filter to playable cards
    let playable = hand;
    if (leadSuit) {
      const suitCards = hand.filter(c => c.suit === leadSuit);
      if (suitCards.length > 0) playable = suitCards;
    }
    
    // Sort by rank
    playable.sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
    
    const needsTricks = player.call !== null && player.tricksWon < player.call;
    
    if (needsTricks) {
      return playable[0]; // Play highest
    } else {
      return playable[playable.length - 1]; // Play lowest
    }
  }
  
  // When human finishes their qualifying game
  finishHumanQualifying(): void {
    if (!this.state.isOlympics || !this.state.olympicsState) return;
    if (this.state.phase !== "game_end") return;
    
    const olympics = this.state.olympicsState;
    
    // Record human's group result
    const sortedPlayers = [...this.state.players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];
    const humanPlayer = this.state.players.find(p => !p.isCPU);
    
    olympics.groups[0].completed = true;
    olympics.groups[0].winnerId = winner.id;
    olympics.groups[0].finalScores = this.state.players.map(p => ({ playerId: p.id, score: p.score }));
    
    // Check if human qualified
    olympics.humanGroupWon = humanPlayer?.id === winner.id;
    olympics.humanQualified = olympics.humanGroupWon;
    
    if (olympics.humanQualified) {
      olympics.finalsPlayerIds.unshift(humanPlayer!.id); // Add human to finals
    }
    
    // Generate match report for group 1
    const runnerUp = sortedPlayers[1];
    olympics.groups[0].matchReport = generateMatchReport(
      winner.name,
      runnerUp.name,
      winner.score,
      runnerUp.score,
      1
    );
    
    // Move to results phase
    olympics.currentPhase = "qualifying_results";
  }
  
  // Start the finals
  startOlympicsFinals(): void {
    if (!this.state.isOlympics || !this.state.olympicsState || !this.state.allOlympicsPlayers) return;
    if (this.state.olympicsState.currentPhase !== "qualifying_results") return;
    
    const olympics = this.state.olympicsState;
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
    this.state.dealerIndex = -1;
    this.state.phase = "lobby";
    
    // If human didn't qualify, simulate the finals
    if (!olympics.humanQualified) {
      const result = this.simulateFullGame(this.state.players);
      
      // Set up final scores
      this.state.players.forEach(p => {
        const playerResult = result.scores.find(s => s.playerId === p.id);
        if (playerResult) p.score = playerResult.score;
      });
      
      // Generate finals match report
      const sortedPlayers = [...this.state.players].sort((a, b) => b.score - a.score);
      const winner = sortedPlayers[0];
      const runnerUp = sortedPlayers[1];
      
      olympics.finalsMatchReport = generateMatchReport(
        winner.name,
        runnerUp.name,
        winner.score,
        runnerUp.score,
        0 // Finals
      ).replace("Table 0", "the Grand Final");

      olympics.grandChampionId = result.winnerId;
      olympics.championQuote = generateChampionQuote();
      olympics.finalsCompleted = true;
      olympics.currentPhase = "complete";
      this.state.phase = "game_end";
    } else {
      // Human plays the finals
      this.startGame();
    }
  }
  
  // When finals end (human played)
  finishOlympicsFinals(): void {
    if (!this.state.isOlympics || !this.state.olympicsState) return;
    if (this.state.phase !== "game_end") return;
    if (this.state.olympicsState.currentPhase !== "finals") return;
    
    const olympics = this.state.olympicsState;
    
    const sortedPlayers = [...this.state.players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];
    const runnerUp = sortedPlayers[1];
    
    olympics.grandChampionId = winner.id;
    olympics.championQuote = generateChampionQuote();
    olympics.finalsCompleted = true;
    olympics.currentPhase = "complete";

    olympics.finalsMatchReport = generateMatchReport(
      winner.name,
      runnerUp.name,
      winner.score,
      runnerUp.score,
      0
    ).replace("Table 0", "the Grand Final");
  }
  
  nextOlympicsGame(): void {
    if (!this.state.isOlympics || !this.state.olympicsState || !this.state.allOlympicsPlayers) return;
    if (this.state.phase !== "game_end") return;

    const olympics = this.state.olympicsState;
    
    // Handle qualifying completion
    if (olympics.currentPhase === "qualifying") {
      this.finishHumanQualifying();
      return;
    }
    
    // Handle finals completion
    if (olympics.currentPhase === "finals") {
      this.finishOlympicsFinals();
      return;
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

    // Keller format: Hide own cards during blind calling phase
    if (state.phase === "calling" && state.gameFormat === "keller") {
      const currentPlayer = state.players.find(p => p.id === playerId);
      const kellerState = state.kellerPlayerStates?.[playerId];

      // Hide cards if blind calling OR if round 1 and haven't made blind choice yet
      if (currentPlayer && kellerState) {
        const shouldHideCards = currentPlayer.isBlindCalling ||
          (state.currentRound === 1 && !kellerState.madeRoundOneBlindChoice);

        if (shouldHideCards) {
          currentPlayer.hand = currentPlayer.hand.map(() => ({ suit: "clubs" as Suit, rank: "2" as Rank }));
        }
      }
    }

    // Hide swap deck from all players
    if (state.swapDeck) {
      state.swapDeck = [];
    }

    return state;
  }
}

// Game manager to handle multiple games
class GameManager {
  private games: Map<string, Game> = new Map();
  private playerGameMap: Map<string, string> = new Map(); // playerId -> gameId

  createGame(hostName: string, hostId: string, gameFormat: GameFormat = "traditional"): Game {
    const game = new Game(hostName, hostId, false, 0, gameFormat);
    this.games.set(game.state.id, game);
    this.playerGameMap.set(hostId, game.state.id);
    return game;
  }

  createSinglePlayerGame(hostName: string, hostId: string, cpuCount: number, gameFormat: GameFormat = "traditional"): Game {
    const game = new Game(hostName, hostId, true, cpuCount, gameFormat);
    this.games.set(game.state.id, game);
    this.playerGameMap.set(hostId, game.state.id);
    return game;
  }

  createOlympicsGame(hostName: string, hostId: string, preferredCountryCode?: string, gameFormat: GameFormat = "traditional"): Game {
    const game = new Game(hostName, hostId, true, 0, gameFormat);

    // Generate all 49 World Cup players
    let olympicsPlayers = generateOlympicsPlayers();

    // If user selected a country, find it and swap to position 0
    if (preferredCountryCode) {
      const selectedIdx = olympicsPlayers.findIndex(p => p.countryCode === preferredCountryCode);
      if (selectedIdx > 0) {
        [olympicsPlayers[0], olympicsPlayers[selectedIdx]] = [olympicsPlayers[selectedIdx], olympicsPlayers[0]];
      }
    }

    // Create all 49 player objects
    const allPlayers: Player[] = olympicsPlayers.map((op, index) => {
      if (index === 0) {
        // Human player - use their entered name
        return {
          id: hostId,
          name: hostName,
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
    
    // Set up Olympics state - start in draws phase to show table assignments
    game.state.isOlympics = true;
    game.state.allOlympicsPlayers = allPlayers;
    game.state.olympicsState = {
      currentGroupIndex: 0,
      groups,
      finalsPlayerIds: [],
      finalsCompleted: false,
      grandChampionId: null,
      currentPhase: "draws",
      humanQualified: false,
      humanGroupWon: false,
    };
    
    // Set current game players to first group (where human is)
    game.state.players = allPlayers.slice(0, 7);
    game.state.phase = "lobby"; // Keep in lobby until qualifying starts

    // Initialize Keller state for all Olympics players if using Keller format
    if (gameFormat === "keller") {
      game.state.kellerPlayerStates = {};
      for (const player of allPlayers) {
        game.state.kellerPlayerStates[player.id] = {
          consecutiveZeroCalls: 0,
          blindRoundsCompleted: 0,
          blindRoundsRemaining: 3,
          isInBlindMode: false,
          blindModeStartedRound: null,
          blindModeStartsNextRound: false,
          madeRoundOneBlindChoice: false,
          swapUsed: false,
          haloScore: null,
          brucieMultiplier: 2,
        };
      }
    }

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

  // Reconnect a player to their existing game with a new WebSocket connection
  reconnectPlayer(oldPlayerId: string, gameId: string, newPlayerId: string): Game | null {
    const game = this.games.get(gameId);
    if (!game) {
      console.log(`Reconnect failed: game ${gameId} not found`);
      return null;
    }

    // Find the player in the game by the old playerId
    const playerIndex = game.state.players.findIndex(p => p.id === oldPlayerId);
    if (playerIndex === -1) {
      console.log(`Reconnect failed: player ${oldPlayerId} not found in game ${gameId}`);
      return null;
    }

    // Update the player's ID to the new connection's ID
    const player = game.state.players[playerIndex];
    player.id = newPlayerId;

    // Update the playerGameMap
    this.playerGameMap.delete(oldPlayerId);
    this.playerGameMap.set(newPlayerId, gameId);

    // Update Keller player state if applicable
    if (game.state.kellerPlayerStates && game.state.kellerPlayerStates[oldPlayerId]) {
      game.state.kellerPlayerStates[newPlayerId] = game.state.kellerPlayerStates[oldPlayerId];
      delete game.state.kellerPlayerStates[oldPlayerId];
    }

    // Update minigame states if player was in a minigame
    if (game.state.haloMinigame?.currentPlayerId === oldPlayerId) {
      game.state.haloMinigame.currentPlayerId = newPlayerId;
    }
    if (game.state.brucieBonus?.currentPlayerId === oldPlayerId) {
      game.state.brucieBonus.currentPlayerId = newPlayerId;
    }

    console.log(`Player reconnected successfully: ${player.name} (${oldPlayerId} -> ${newPlayerId}) in game ${gameId}`);
    return game;
  }

  restoreSavedGame(savedState: GameState, newPlayerId: string): Game | null {
    // Only allow restoring single player or Olympics games
    if (!savedState.isSinglePlayer && !savedState.isOlympics) {
      return null;
    }

    // Find the human player in the saved state
    const humanPlayer = savedState.players.find(p => !p.isCPU);
    if (!humanPlayer) return null;

    // Create a new game instance
    const game = new Game(humanPlayer.name, newPlayerId, savedState.isSinglePlayer || false, 0, savedState.gameFormat || "traditional");

    // Generate a new game ID for the restored game
    const newGameId = game.state.id;

    // Replace the state with the saved state
    game.state = { ...savedState, id: newGameId };

    // Update the human player's ID to the new connection's ID
    const playerIndex = game.state.players.findIndex(p => !p.isCPU);
    if (playerIndex >= 0) {
      const oldPlayerId = game.state.players[playerIndex].id;
      game.state.players[playerIndex].id = newPlayerId;
      game.state.players[playerIndex].isConnected = true;

      // Also update kellerPlayerStates if it exists
      if (game.state.kellerPlayerStates && game.state.kellerPlayerStates[oldPlayerId]) {
        game.state.kellerPlayerStates[newPlayerId] = game.state.kellerPlayerStates[oldPlayerId];
        delete game.state.kellerPlayerStates[oldPlayerId];
      }

      // Update allOlympicsPlayers if this is an Olympics game
      if (game.state.allOlympicsPlayers) {
        const olympicsPlayerIndex = game.state.allOlympicsPlayers.findIndex(p => p.id === oldPlayerId);
        if (olympicsPlayerIndex >= 0) {
          game.state.allOlympicsPlayers[olympicsPlayerIndex].id = newPlayerId;
        }
      }

      // Update any references in Olympics groups
      if (game.state.olympicsState?.groups) {
        for (const group of game.state.olympicsState.groups) {
          const groupPlayerIdx = group.playerIds.indexOf(oldPlayerId);
          if (groupPlayerIdx >= 0) {
            group.playerIds[groupPlayerIdx] = newPlayerId;
          }
          if (group.winnerId === oldPlayerId) {
            group.winnerId = newPlayerId;
          }
        }
      }

      // Update finals player IDs
      if (game.state.olympicsState?.finalsPlayerIds) {
        const finalsIdx = game.state.olympicsState.finalsPlayerIds.indexOf(oldPlayerId);
        if (finalsIdx >= 0) {
          game.state.olympicsState.finalsPlayerIds[finalsIdx] = newPlayerId;
        }
      }

      // Update Halo minigame state if the human was playing
      if (game.state.haloMinigame) {
        if (game.state.haloMinigame.currentPlayerId === oldPlayerId) {
          game.state.haloMinigame.currentPlayerId = newPlayerId;
        }
        // Update lastResult if it references the old player
        if (game.state.haloMinigame.lastResult?.playerId === oldPlayerId) {
          game.state.haloMinigame.lastResult.playerId = newPlayerId;
        }
        // Update player results
        for (const result of game.state.haloMinigame.playerResults) {
          if (result.playerId === oldPlayerId) {
            result.playerId = newPlayerId;
          }
        }
      }

      // Update Brucie Bonus state if the human was playing
      if (game.state.brucieBonus) {
        if (game.state.brucieBonus.currentPlayerId === oldPlayerId) {
          game.state.brucieBonus.currentPlayerId = newPlayerId;
        }
        // Update lastResult if it references the old player
        if (game.state.brucieBonus.lastResult?.playerId === oldPlayerId) {
          game.state.brucieBonus.lastResult.playerId = newPlayerId;
        }
        // Update player multipliers
        for (const result of game.state.brucieBonus.playerMultipliers) {
          if (result.playerId === oldPlayerId) {
            result.playerId = newPlayerId;
          }
        }
      }
    }

    // Register the game
    this.games.set(newGameId, game);
    this.playerGameMap.set(newPlayerId, newGameId);

    return game;
  }
}

export const gameManager = new GameManager();
