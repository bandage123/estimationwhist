import { Card, Player, Suit, Trick } from "@shared/schema";
import { PlayingCard } from "./PlayingCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

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
        {currentTrick.cards.length > 0 ? (
          <div className="flex gap-0.5 md:gap-2 flex-wrap justify-center">
            {currentTrick.cards.map(({ playerId, card }, index) => {
              const player = players.find(p => p.id === playerId);
              return (
                <div key={index} className="flex flex-col items-center gap-0">
                  <span className="text-[9px] md:text-xs text-foreground/80 font-medium truncate max-w-[40px] md:max-w-none">
                    {player?.name || "?"}
                  </span>
                  <div className="md:hidden">
                    <PlayingCard card={card} size="sm" />
                  </div>
                  <div className="hidden md:block">
                    <PlayingCard card={card} size="md" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <p className="text-sm md:text-lg">Waiting for cards...</p>
            {currentPlayer && (
              <p className="text-xs md:text-sm mt-1 flex items-center justify-center gap-1">
                <span className="font-semibold text-primary">
                  {currentPlayer.name}
                </span>
                {currentPlayer.isCPUControlled && (
                  <span className="inline-flex items-center gap-0.5 text-orange-500">
                    <Bot className="w-3 h-3" />
                    <span className="text-[10px]">(CPU)</span>
                  </span>
                )}
                <span> to play</span>
              </p>
            )}
          </div>
        )}
      </div>

      {currentTrick.leadSuit && (
        <p className="text-xs md:text-sm text-muted-foreground">
          Lead: <span className="font-semibold">{suitSymbols[currentTrick.leadSuit]}</span>
        </p>
      )}
    </div>
  );
}
