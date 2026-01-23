import { Card, Suit } from "@shared/schema";
import { PlayingCard } from "./PlayingCard";
import { cn } from "@/lib/utils";

interface PlayerHandProps {
  cards: Card[];
  onPlayCard?: (card: Card) => void;
  selectedCard?: Card | null;
  onSelectCard?: (card: Card | null) => void;
  playableCards?: Card[];
  isCurrentPlayer: boolean;
  leadSuit?: Suit | null;
}

export function PlayerHand({
  cards,
  onPlayCard,
  selectedCard,
  onSelectCard,
  playableCards,
  isCurrentPlayer,
}: PlayerHandProps) {
  const sortedCards = [...cards].sort((a, b) => {
    const suitOrder: Record<Suit, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    const rankOrder = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
  });

  const isCardPlayable = (card: Card): boolean => {
    if (!isCurrentPlayer || !playableCards) return false;
    return playableCards.some(pc => pc.suit === card.suit && pc.rank === card.rank);
  };

  const handleCardClick = (card: Card) => {
    if (!isCurrentPlayer) return;
    
    if (!isCardPlayable(card)) return;

    if (selectedCard?.suit === card.suit && selectedCard?.rank === card.rank) {
      onPlayCard?.(card);
    } else {
      onSelectCard?.(card);
    }
  };

  const cardWidth = 64; // w-16 = 64px
  const overlapFactor = cards.length > 5 ? 0.5 : 0.3;
  const totalWidth = cardWidth + (cards.length - 1) * cardWidth * (1 - overlapFactor);

  return (
    <div className="flex flex-col items-center gap-2 md:gap-3">
      <div 
        className="relative flex justify-center"
        style={{ width: `${totalWidth}px`, height: "88px" }}
        data-testid="player-hand"
      >
        {sortedCards.map((card, index) => {
          const isSelected = selectedCard?.suit === card.suit && selectedCard?.rank === card.rank;
          const isPlayable = isCardPlayable(card);
          
          return (
            <div
              key={`${card.suit}-${card.rank}`}
              className="absolute transition-all duration-200"
              style={{
                left: `${index * cardWidth * (1 - overlapFactor)}px`,
                zIndex: isSelected ? 50 : index,
              }}
            >
              <PlayingCard
                card={card}
                onClick={() => handleCardClick(card)}
                disabled={!isCurrentPlayer || !isPlayable}
                selected={isSelected}
                size="md"
              />
            </div>
          );
        })}
      </div>
      
      {isCurrentPlayer && selectedCard && (
        <p className="text-xs md:text-sm text-muted-foreground">
          Tap again to play
        </p>
      )}
    </div>
  );
}

interface OpponentHandProps {
  cardCount: number;
  playerName: string;
  isCurrentPlayer: boolean;
  call: number | null;
  tricksWon: number;
  position: "top" | "left" | "right";
}

export function OpponentHand({
  cardCount,
  playerName,
  isCurrentPlayer,
  call,
  tricksWon,
  position,
}: OpponentHandProps) {
  const cards = Array.from({ length: cardCount }, (_, i) => i);
  
  const containerClass = cn(
    "flex flex-col items-center gap-2",
    position === "left" && "rotate-90",
    position === "right" && "-rotate-90"
  );

  const cardOverlap = cardCount > 5 ? 10 : 8;

  return (
    <div className={containerClass}>
      <div 
        className={cn(
          "px-3 py-1.5 rounded-full text-sm font-medium",
          isCurrentPlayer 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-muted-foreground"
        )}
      >
        <span data-testid={`player-name-${playerName}`}>{playerName}</span>
        {call !== null && (
          <span className="ml-2" data-testid={`player-call-${playerName}`}>
            ({tricksWon}/{call})
          </span>
        )}
      </div>
      
      <div className="relative flex" style={{ height: "44px" }}>
        {cards.map((_, index) => (
          <div
            key={index}
            className="absolute"
            style={{
              left: `${index * cardOverlap}px`,
              zIndex: index,
            }}
          >
            <div className="w-8 h-11 rounded bg-gradient-to-br from-emerald-700 to-emerald-800 border border-emerald-600 shadow-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
