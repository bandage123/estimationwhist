import { Player } from "@shared/schema";
import { PlayerAvatar, getAvatarStyle, checkEmotionTrigger, Emotion } from "../avatars";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

export type Position = "top" | "top-left" | "top-right" | "left" | "right";

interface OpponentPositionProps {
  player: Player;
  position: Position;
  isCurrentTurn: boolean;
  justWonTrick?: boolean;
  compact?: boolean;
}

export function OpponentPosition({
  player,
  position,
  isCurrentTurn,
  justWonTrick = false,
  compact = false,
}: OpponentPositionProps) {
  const avatarStyle = getAvatarStyle(player.id);
  const [emotion, setEmotion] = useState<Emotion>("neutral");
  const emotionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for emotion triggers
  useEffect(() => {
    const newEmotion = checkEmotionTrigger(
      player.id,
      player.tricksWon,
      player.call,
      player.hand.length,
      justWonTrick
    );

    if (newEmotion !== "neutral") {
      setEmotion(newEmotion);
      // Clear emotion after 3 seconds
      if (emotionTimeoutRef.current) {
        clearTimeout(emotionTimeoutRef.current);
      }
      emotionTimeoutRef.current = setTimeout(() => {
        setEmotion("neutral");
      }, 3000);
    }

    return () => {
      if (emotionTimeoutRef.current) {
        clearTimeout(emotionTimeoutRef.current);
      }
    };
  }, [player.id, player.tricksWon, player.call, player.hand.length, justWonTrick]);

  const positionClasses: Record<Position, string> = {
    top: "top-1 left-1/2 -translate-x-1/2",
    "top-left": "top-2 left-[15%]",
    "top-right": "top-2 right-[15%]",
    left: "top-1/3 left-1",
    right: "top-1/3 right-1",
  };

  const cardCount = player.hand.length;

  return (
    <div
      className={cn(
        "absolute flex flex-col items-center gap-0.5 transition-all duration-300",
        positionClasses[position],
        isCurrentTurn && "scale-105"
      )}
      data-position={position}
    >
      {/* Avatar */}
      <PlayerAvatar
        style={avatarStyle}
        emotion={emotion}
        size={compact ? "sm" : "md"}
        className={cn(isCurrentTurn && "ring-2 ring-primary ring-offset-1 rounded-lg")}
      />

      {/* Player name */}
      <div
        className={cn(
          "text-center font-medium truncate max-w-[80px]",
          compact ? "text-[9px]" : "text-xs",
          isCurrentTurn && "text-primary"
        )}
        title={player.name}
      >
        {player.name}
      </div>

      {/* Card count and call info */}
      <div className={cn("flex items-center gap-1", compact ? "text-[8px]" : "text-[10px]")}>
        {/* Card backs showing remaining cards */}
        {!compact && cardCount > 0 && (
          <div className="flex -space-x-2">
            {Array.from({ length: Math.min(cardCount, 7) }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-3 h-4 rounded-sm bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-400/50",
                  "transition-all duration-300"
                )}
                style={{ zIndex: i }}
              />
            ))}
          </div>
        )}

        {/* Compact: just show count */}
        {compact && (
          <span className="text-muted-foreground">
            {cardCount} cards
          </span>
        )}

        {/* Call/tricks display */}
        {player.call !== null && (
          <span className={cn(
            "text-muted-foreground",
            player.tricksWon === player.call && "text-green-500",
            player.tricksWon > player.call && "text-red-500"
          )}>
            ({player.tricksWon}/{player.call})
          </span>
        )}
      </div>
    </div>
  );
}

export default OpponentPosition;
