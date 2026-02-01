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

// Map number of opponents to their positions
function getPositions(opponentCount: number): Position[] {
  switch (opponentCount) {
    case 1:
      return ["top"];
    case 2:
      return ["top-left", "top-right"];
    case 3:
      return ["left", "top", "right"];
    default:
      return ["top"];
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

  // Desktop layout with spatial positioning
  const desktopLayout = (
    <div className={cn("hidden md:block relative w-full", className)} style={{ minHeight: "400px" }}>
      {/* Opponents positioned around the table */}
      {opponents.map((player, index) => (
        <OpponentPosition
          key={player.id}
          player={player}
          position={positions[index]}
          isCurrentTurn={player.id === currentTurnPlayerId}
          justWonTrick={player.id === lastTrickWinnerId}
        />
      ))}

      {/* Center area for TrickArea */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-xl">
        {children}
      </div>
    </div>
  );

  // Mobile layout - simplified horizontal
  const mobileLayout = (
    <div className={cn("md:hidden flex flex-col", className)}>
      {/* Opponents in a row above */}
      <div className="flex justify-center gap-3 py-1 px-2">
        {opponents.map((player) => (
          <OpponentPosition
            key={player.id}
            player={player}
            position="top" // Position doesn't affect mobile layout
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
