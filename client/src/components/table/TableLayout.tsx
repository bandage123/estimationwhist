import { Player } from "@shared/schema";
import { OpponentPosition, Position } from "./OpponentPosition";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface TableLayoutProps {
  opponents: Player[];
  currentPlayerId: string | null;
  currentTurnPlayerId: string | null;
  lastTrickWinnerId?: string | null;
  children: ReactNode; // TrickArea goes here
  className?: string;
}

// Split opponents into left and right groups
function splitOpponents(opponents: Player[]): { left: Player[]; right: Player[] } {
  const half = Math.ceil(opponents.length / 2);
  return {
    left: opponents.slice(0, half),
    right: opponents.slice(half),
  };
}

export function TableLayout({
  opponents,
  currentPlayerId,
  currentTurnPlayerId,
  lastTrickWinnerId,
  children,
  className,
}: TableLayoutProps) {
  const { left, right } = splitOpponents(opponents);

  // Desktop layout with spatial positioning - opponents on sides, trick area in center
  const desktopLayout = (
    <div className={cn("hidden md:flex gap-4 items-start", className)}>
      {/* Left side opponents */}
      <div className="flex flex-col gap-2 w-28 shrink-0">
        {left.map((player) => (
          <OpponentPosition
            key={player.id}
            player={player}
            position="left"
            isCurrentTurn={player.id === currentTurnPlayerId}
            justWonTrick={player.id === lastTrickWinnerId}
          />
        ))}
      </div>

      {/* Center area for TrickArea */}
      <div className="flex-1 min-w-0">
        {children}
      </div>

      {/* Right side opponents */}
      <div className="flex flex-col gap-2 w-28 shrink-0">
        {right.map((player) => (
          <OpponentPosition
            key={player.id}
            player={player}
            position="right"
            isCurrentTurn={player.id === currentTurnPlayerId}
            justWonTrick={player.id === lastTrickWinnerId}
          />
        ))}
      </div>
    </div>
  );

  // Mobile layout - avatars on left and right sides vertically
  const mobileLayout = (
    <div className={cn("md:hidden flex", className)}>
      {/* Left side - first half of opponents stacked vertically */}
      <div className="flex flex-col justify-around py-1 w-8 shrink-0">
        {opponents.slice(0, Math.ceil(opponents.length / 2)).map((player) => (
          <OpponentPosition
            key={player.id}
            player={player}
            position="left"
            isCurrentTurn={player.id === currentTurnPlayerId}
            justWonTrick={player.id === lastTrickWinnerId}
            compact
          />
        ))}
      </div>

      {/* Main content area */}
      <div className="flex-1 min-w-0">
        {children}
      </div>

      {/* Right side - second half of opponents stacked vertically */}
      <div className="flex flex-col justify-around py-1 w-8 shrink-0">
        {opponents.slice(Math.ceil(opponents.length / 2)).map((player) => (
          <OpponentPosition
            key={player.id}
            player={player}
            position="right"
            isCurrentTurn={player.id === currentTurnPlayerId}
            justWonTrick={player.id === lastTrickWinnerId}
            compact
          />
        ))}
      </div>
    </div>
  );

  return (
    <>
      {desktopLayout}
      {mobileLayout}
    </>
  );
}

export default TableLayout;
