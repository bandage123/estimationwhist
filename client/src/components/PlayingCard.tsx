import { Card, Suit } from "@shared/schema";
import { cn } from "@/lib/utils";

interface PlayingCardProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  size?: "sm" | "md" | "lg";
  faceDown?: boolean;
}

const suitSymbols: Record<Suit, string> = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
};

const suitColors: Record<Suit, string> = {
  hearts: "text-red-600",
  diamonds: "text-red-600",
  clubs: "text-gray-900 dark:text-gray-100",
  spades: "text-gray-900 dark:text-gray-100",
};

const sizeClasses = {
  sm: "w-12 h-16 text-xs",
  md: "w-16 h-22 text-sm",
  lg: "w-20 h-28 text-base",
};

export function PlayingCard({
  card,
  onClick,
  disabled = false,
  selected = false,
  size = "md",
  faceDown = false,
}: PlayingCardProps) {
  if (faceDown) {
    return (
      <div
        className={cn(
          "playing-card flex items-center justify-center cursor-default",
          sizeClasses[size],
          "bg-gradient-to-br from-blue-800 to-blue-900 border-2 border-blue-700"
        )}
      >
        <div className="w-full h-full m-1 rounded border border-blue-600 bg-blue-800 flex items-center justify-center">
          <div className="text-blue-400 text-2xl font-serif opacity-50">
            W
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={disabled ? undefined : onClick}
      data-testid={`card-${card.suit}-${card.rank}`}
      className={cn(
        "playing-card flex flex-col justify-between p-1.5 cursor-pointer select-none",
        sizeClasses[size],
        "bg-white border border-gray-200",
        selected && "selected",
        disabled && "disabled",
        !disabled && "hover-elevate"
      )}
    >
      <div className={cn("flex items-start gap-0.5", suitColors[card.suit])}>
        <span className="font-bold leading-none">{card.rank}</span>
        <span className="leading-none">{suitSymbols[card.suit]}</span>
      </div>
      
      <div className={cn("flex items-center justify-center text-3xl", suitColors[card.suit])}>
        {suitSymbols[card.suit]}
      </div>
      
      <div className={cn("flex items-end justify-end gap-0.5 rotate-180", suitColors[card.suit])}>
        <span className="font-bold leading-none">{card.rank}</span>
        <span className="leading-none">{suitSymbols[card.suit]}</span>
      </div>
    </div>
  );
}

export function CardBack({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <div
      className={cn(
        "playing-card flex items-center justify-center cursor-default",
        sizeClasses[size],
        "bg-gradient-to-br from-emerald-800 to-emerald-900 border-2 border-emerald-600"
      )}
    >
      <div className="w-[calc(100%-8px)] h-[calc(100%-8px)] rounded border border-emerald-500/50 bg-emerald-800 flex items-center justify-center">
        <div className="text-emerald-400/60 text-xl font-serif font-bold tracking-wider">
          EW
        </div>
      </div>
    </div>
  );
}
