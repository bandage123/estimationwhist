import { Card, Player, Suit, Trick } from "@shared/schema";
import { PlayingCard } from "./PlayingCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TrickAreaProps {
  currentTrick: Trick;
  players: Player[];
  currentPlayerIndex: number;
  trump: Suit | null;
  roundNumber: number;
  cardCount: number;
  doublePoints: boolean;
  trickNumber: number;
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

export function TrickArea({
  currentTrick,
  players,
  currentPlayerIndex,
  trump,
  roundNumber,
  cardCount,
  doublePoints,
  trickNumber,
}: TrickAreaProps) {
  const currentPlayer = players[currentPlayerIndex];

  return (
    <div className="felt-table rounded-2xl p-6 flex flex-col items-center gap-4 min-h-[300px]">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Badge variant="secondary" className="text-sm" data-testid="round-badge">
          Round {roundNumber}/13
        </Badge>
        
        <Badge variant="secondary" className="text-sm" data-testid="cards-badge">
          {cardCount} {cardCount === 1 ? "card" : "cards"}
        </Badge>
        
        {trump ? (
          <Badge 
            variant="default" 
            className={cn(
              "text-sm",
              (trump === "hearts" || trump === "diamonds") && "bg-red-600 text-white"
            )}
            data-testid="trump-badge"
          >
            Trump: {suitSymbols[trump]} {suitNames[trump]}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-sm" data-testid="trump-badge">
            No Trump
          </Badge>
        )}
        
        {doublePoints && (
          <Badge variant="destructive" className="text-sm animate-pulse" data-testid="double-points-badge">
            2x Points!
          </Badge>
        )}

        <Badge variant="outline" className="text-sm" data-testid="trick-badge">
          Trick {trickNumber}/{cardCount}
        </Badge>
      </div>

      <div className="flex-1 flex items-center justify-center">
        {currentTrick.cards.length > 0 ? (
          <div className="flex gap-2 flex-wrap justify-center">
            {currentTrick.cards.map(({ playerId, card }, index) => {
              const player = players.find(p => p.id === playerId);
              return (
                <div key={index} className="flex flex-col items-center gap-1">
                  <span className="text-xs text-foreground/80 font-medium">
                    {player?.name || "Unknown"}
                  </span>
                  <PlayingCard card={card} size="md" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <p className="text-lg">Waiting for cards...</p>
            {currentPlayer && (
              <p className="text-sm mt-1">
                <span className="font-semibold text-primary">{currentPlayer.name}</span> to play
              </p>
            )}
          </div>
        )}
      </div>

      {currentTrick.leadSuit && (
        <p className="text-sm text-muted-foreground">
          Lead suit: <span className="font-semibold">{suitSymbols[currentTrick.leadSuit]} {suitNames[currentTrick.leadSuit]}</span>
        </p>
      )}
    </div>
  );
}
