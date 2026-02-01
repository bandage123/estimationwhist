import { Card, Player, Suit, Trick } from "@shared/schema";
import { PlayingCard } from "./PlayingCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRef, useEffect, useState } from "react";

interface TrickAreaProps {
  currentTrick: Trick;
  players: Player[];
  currentPlayerIndex: number;
  trump: Suit | null;
  roundNumber: number;
  cardCount: number;
  doublePoints: boolean;
  trickNumber: number;
  currentPlayerId?: string | null;
}

const suitSymbols: Record<Suit, string> = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
};

const suitNames: Record<Suit, string> = {
  hearts: "Hearts",
  diamonds: "Diamonds",
  clubs: "Clubs",
  spades: "Spades",
};

// Get animation class based on player position relative to current user
function getCardAnimationClass(
  playerId: string,
  currentPlayerId: string | null | undefined,
  players: Player[]
): string {
  // If it's the current user's card, animate from bottom
  if (playerId === currentPlayerId) {
    return "card-from-bottom";
  }

  // Find opponent position
  const opponents = players.filter(p => p.id !== currentPlayerId);
  const opponentIndex = opponents.findIndex(p => p.id === playerId);

  if (opponentIndex === -1) return "card-entering";

  // Map opponent index to position
  switch (opponents.length) {
    case 1:
      return "card-from-top";
    case 2:
      return opponentIndex === 0 ? "card-from-top-left" : "card-from-top-right";
    case 3:
      if (opponentIndex === 0) return "card-from-left";
      if (opponentIndex === 1) return "card-from-top";
      return "card-from-right";
    default:
      return "card-entering";
  }
}

export function TrickArea({
  currentTrick,
  players,
  currentPlayerIndex,
  trump,
  roundNumber,
  cardCount,
  doublePoints,
  trickNumber,
  currentPlayerId,
}: TrickAreaProps) {
  const currentPlayer = players[currentPlayerIndex];

  // Track which cards have been animated
  const [animatedCards, setAnimatedCards] = useState<Set<string>>(new Set());
  const prevTrickLengthRef = useRef(currentTrick.cards.length);

  // Reset animations when trick resets
  useEffect(() => {
    if (currentTrick.cards.length < prevTrickLengthRef.current) {
      setAnimatedCards(new Set());
    }
    prevTrickLengthRef.current = currentTrick.cards.length;
  }, [currentTrick.cards.length]);

  // Mark new cards for animation
  useEffect(() => {
    const cardKeys = currentTrick.cards.map((c, i) => `${c.playerId}-${i}`);
    const newCards = cardKeys.filter(key => !animatedCards.has(key));

    if (newCards.length > 0) {
      // Add new cards to animated set after animation completes
      const timeout = setTimeout(() => {
        setAnimatedCards(prev => {
          const next = new Set(prev);
          newCards.forEach(key => next.add(key));
          return next;
        });
      }, 350); // Slightly longer than animation duration

      return () => clearTimeout(timeout);
    }
  }, [currentTrick.cards, animatedCards]);

  return (
    <div className="felt-table rounded-xl md:rounded-2xl p-2 md:p-6 flex flex-col items-center gap-1 md:gap-4 min-h-[140px] md:min-h-[300px]">
      <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-3">
        <Badge variant="secondary" className="text-xs md:text-sm" data-testid="round-badge">
          R{roundNumber}/13
        </Badge>

        {trump ? (
          <Badge
            variant="default"
            className={cn(
              "text-xs md:text-sm",
              (trump === "hearts" || trump === "diamonds") && "bg-red-600 text-white"
            )}
            data-testid="trump-badge"
          >
            {suitSymbols[trump]} {suitNames[trump]}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs md:text-sm" data-testid="trump-badge">
            No Trump
          </Badge>
        )}

        {doublePoints && (
          <Badge variant="destructive" className="text-xs md:text-sm animate-pulse" data-testid="double-points-badge">
            2x
          </Badge>
        )}

        <Badge variant="outline" className="text-xs md:text-sm" data-testid="trick-badge">
          Trick {trickNumber}/{cardCount}
        </Badge>
      </div>

      <div className="flex-1 flex items-center justify-center">
        {/* Fixed slots for all players - cards don't shift once placed */}
        <div className="flex gap-0.5 md:gap-2">
          {players.map((player) => {
            // Find if this player has played a card in the current trick
            const playedCard = currentTrick.cards.find(c => c.playerId === player.id);
            const cardIndex = currentTrick.cards.findIndex(c => c.playerId === player.id);
            const cardKey = playedCard ? `${player.id}-${cardIndex}` : null;
            const isNewCard = cardKey && !animatedCards.has(cardKey);
            const animationClass = isNewCard
              ? getCardAnimationClass(player.id, currentPlayerId, players)
              : "";

            return (
              <div key={player.id} className={cn("flex flex-col items-center gap-0", playedCard ? animationClass : "")}>
                <span className="text-[7px] md:text-xs text-foreground/80 font-medium truncate max-w-[36px] md:max-w-none">
                  {player.name}
                </span>
                {playedCard ? (
                  <>
                    <div className="md:hidden">
                      <PlayingCard card={playedCard.card} size="xs" />
                    </div>
                    <div className="hidden md:block">
                      <PlayingCard card={playedCard.card} size="md" />
                    </div>
                  </>
                ) : (
                  // Empty slot placeholder - same size as card
                  <>
                    <div className="md:hidden w-9 h-[54px] rounded border border-dashed border-white/20" />
                    <div className="hidden md:block w-16 h-24 rounded border border-dashed border-white/20" />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {currentTrick.leadSuit && (
        <p className="text-xs md:text-sm text-muted-foreground">
          Lead: <span className="font-semibold">{suitSymbols[currentTrick.leadSuit]}</span>
        </p>
      )}
    </div>
  );
}
