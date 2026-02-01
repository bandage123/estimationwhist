import { useEffect, useState } from "react";
import { Player } from "@shared/schema";
import { cn } from "@/lib/utils";

interface GameEndEffectsProps {
  players: Player[];
  currentPlayerId: string | null;
}

type ResultType = "winner" | "last" | "loser" | null;

export function GameEndEffects({ players, currentPlayerId }: GameEndEffectsProps) {
  const [showEffect, setShowEffect] = useState(false);
  const [resultType, setResultType] = useState<ResultType>(null);

  useEffect(() => {
    if (!currentPlayerId || players.length === 0) return;

    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const playerIndex = sortedPlayers.findIndex(p => p.id === currentPlayerId);

    if (playerIndex === 0) {
      setResultType("winner");
    } else if (playerIndex === sortedPlayers.length - 1) {
      setResultType("last");
    } else {
      setResultType("loser");
    }

    setShowEffect(true);

    // Clear shake effect after animation
    const timeout = setTimeout(() => {
      if (resultType === "last") {
        setShowEffect(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [players, currentPlayerId]);

  if (!showEffect || !resultType) return null;

  return (
    <>
      {/* Confetti for winner */}
      {resultType === "winner" && <Confetti />}

      {/* Screen shake for last place */}
      {resultType === "last" && <div className="screen-shake" />}

      {/* Red vignette pulse for other losses */}
      {resultType === "loser" && <div className="vignette-pulse" />}
    </>
  );
}

// Confetti component with falling particles
function Confetti() {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    delay: number;
    duration: number;
    color: string;
    size: number;
  }>>([]);

  useEffect(() => {
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.x}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
          }}
        />
      ))}
    </div>
  );
}

export default GameEndEffects;
