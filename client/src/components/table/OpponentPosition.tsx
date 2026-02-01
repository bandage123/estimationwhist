import { Player } from "@shared/schema";
import { PlayerAvatar, getAvatarStyle, checkEmotionTrigger, Emotion } from "../avatars";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

export type Position = "top" | "top-left" | "top-right" | "left" | "right" | "bottom-left" | "bottom-right";

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

  const cardCount = player.hand.length;

  // Mobile compact view - tiny head on the side
  if (compact) {
    return (
      <div
        className={cn(
          "flex flex-col items-center w-7 transition-all duration-300",
          isCurrentTurn && "scale-110"
        )}
      >
        {/* Tiny avatar head */}
        <PlayerAvatar
          style={avatarStyle}
          emotion={emotion}
          size="xs"
          className={cn(isCurrentTurn && "ring-1 ring-primary rounded")}
        />

        {/* Minimal info below */}
        <div
          className={cn(
            "text-[6px] font-medium truncate w-full text-center leading-tight",
            isCurrentTurn && "text-primary"
          )}
          title={player.name}
        >
          {player.name.slice(0, 4)}
        </div>
        <div className={cn(
          "text-[6px] leading-tight font-bold",
          player.call !== null && player.tricksWon === player.call && "text-green-500",
          player.call !== null && player.tricksWon > player.call && "text-red-500",
          player.call === null && "text-muted-foreground"
        )}>
          {player.call !== null ? `${player.tricksWon}/${player.call}` : cardCount}
        </div>
      </div>
    );
  }

  // Desktop view - full info with card backs
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300",
        isCurrentTurn && "bg-primary/10 ring-1 ring-primary"
      )}
    >
      {/* Avatar */}
      <PlayerAvatar
        style={avatarStyle}
        emotion={emotion}
        size="md"
      />

      {/* Player name */}
      <div
        className={cn(
          "text-center font-medium truncate max-w-[100px] text-xs",
          isCurrentTurn && "text-primary"
        )}
        title={player.name}
      >
        {player.name}
      </div>

      {/* Card backs showing remaining cards */}
      {cardCount > 0 && (
        <div className="flex justify-center -space-x-1.5">
          {Array.from({ length: Math.min(cardCount, 7) }).map((_, i) => (
            <div
              key={i}
              className="w-3 h-4 rounded-sm bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-400/50 shadow-sm"
              style={{ zIndex: i }}
            />
          ))}
          {cardCount > 7 && (
            <span className="text-[8px] text-muted-foreground ml-1">+{cardCount - 7}</span>
          )}
        </div>
      )}

      {/* Call/tricks display - prominent */}
      <div className="text-center">
        {player.call !== null ? (
          <div className={cn(
            "text-sm font-bold",
            player.tricksWon === player.call && "text-green-500",
            player.tricksWon > player.call && "text-red-500",
            player.tricksWon < player.call && "text-foreground"
          )}>
            {player.tricksWon}/{player.call}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            {cardCount} cards
          </div>
        )}
      </div>
    </div>
  );
}

export default OpponentPosition;
