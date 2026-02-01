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

// Map number of opponents to their positions - sides and corners, not above
function getPositions(opponentCount: number): Position[] {
  switch (opponentCount) {
    case 1:
      return ["top-left"];
    case 2:
      return ["top-left", "top-right"];
    case 3:
      return ["left", "top-right", "right"];
    default:
      return ["top-left"];
  }
}

export function TableLayout({
  opponents,
  currentPlayerId,
  currentTurnPlayerId,
  lastTrickWinnerId,
  children,
  className,
}: TableLayoutProps) {
  const positions = getPositions(opponents.length);

  // Desktop layout with spatial positioning - opponents on sides, trick area in center
  const desktopLayout = (
    <div className={cn("hidden md:flex gap-4 items-start", className)}>
      {/* Left side opponents */}
      <div className="flex flex-col gap-3 w-28 shrink-0">
        {opponents.map((player, index) => {
          const pos = positions[index];
          if (pos === "left" || pos === "top-left" || pos === "bottom-left") {
            return (
              <OpponentPosition
                key={player.id}
                player={player}
                position={pos}
                isCurrentTurn={player.id === currentTurnPlayerId}
                justWonTrick={player.id === lastTrickWinnerId}
              />
            );
          }
          return null;
        })}
      </div>

      {/* Center area for TrickArea */}
      <div className="flex-1 min-w-0">
        {children}
      </div>

      {/* Right side opponents */}
      <div className="flex flex-col gap-3 w-28 shrink-0">
        {opponents.map((player, index) => {
          const pos = positions[index];
          if (pos === "right" || pos === "top-right" || pos === "bottom-right") {
            return (
              <OpponentPosition
                key={player.id}
                player={player}
                position={pos}
                isCurrentTurn={player.id === currentTurnPlayerId}
                justWonTrick={player.id === lastTrickWinnerId}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );

  // Mobile layout - small avatars spaced horizontally
  const mobileLayout = (
    <div className={cn("md:hidden flex flex-col", className)}>
      {/* Opponents in a row above - evenly spaced */}
      <div className="flex justify-around items-start py-1 px-1 mb-1">
        {opponents.map((player) => (
          <OpponentPosition
            key={player.id}
            player={player}
            position="top"
            isCurrentTurn={player.id === currentTurnPlayerId}
            justWonTrick={player.id === lastTrickWinnerId}
            compact
          />
        ))}
      </div>

      {/* TrickArea below */}
      <div className="flex-1">
        {children}
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
