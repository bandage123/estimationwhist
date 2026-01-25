import { KellerPlayerState } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Shuffle, AlertTriangle } from "lucide-react";

interface KellerStatusBarProps {
  kellerState: KellerPlayerState | undefined;
  isCurrentPlayer: boolean;
  isCallingPhase: boolean;
  onStartBlindRounds: () => void;
  onUseSwap?: () => void;
  swapMode?: boolean;
}

export function KellerStatusBar({
  kellerState,
  isCurrentPlayer,
  isCallingPhase,
  onStartBlindRounds,
  onUseSwap,
  swapMode,
}: KellerStatusBarProps) {
  if (!kellerState) return null;

  const canStartBlind =
    isCallingPhase &&
    isCurrentPlayer &&
    !kellerState.isInBlindMode &&
    kellerState.blindRoundsCompleted < 3;

  const canSwap =
    isCallingPhase &&
    isCurrentPlayer &&
    !kellerState.swapUsed;

  const showNo3ZWarning =
    isCallingPhase &&
    isCurrentPlayer &&
    kellerState.consecutiveZeroCalls >= 2;

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
      {/* Blind Rounds Status */}
      <div className="flex items-center gap-1.5">
        {kellerState.isInBlindMode ? (
          <Badge variant="secondary" className="gap-1 bg-purple-500/20 text-purple-700 dark:text-purple-300">
            <EyeOff className="w-3 h-3" />
            Blind Mode ({kellerState.blindRoundsCompleted}/3)
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <Eye className="w-3 h-3" />
            Blind: {kellerState.blindRoundsCompleted}/3
          </Badge>
        )}
        {canStartBlind && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-500/10"
            onClick={onStartBlindRounds}
          >
            Go Blind
          </Button>
        )}
      </div>

      {/* Swap Status */}
      <div className="flex items-center gap-1.5">
        <Badge variant={kellerState.swapUsed ? "secondary" : "outline"} className="gap-1">
          <Shuffle className="w-3 h-3" />
          {kellerState.swapUsed ? "Swap Used" : "Swap Ready"}
        </Badge>
        {canSwap && !swapMode && onUseSwap && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
            onClick={onUseSwap}
          >
            Use Swap
          </Button>
        )}
        {swapMode && (
          <span className="text-xs text-blue-600 font-medium">Select a card to swap</span>
        )}
      </div>

      {/* No3Z Warning */}
      {showNo3ZWarning && (
        <Badge variant="destructive" className="gap-1 animate-pulse">
          <AlertTriangle className="w-3 h-3" />
          No3Z: Can't call 0!
        </Badge>
      )}

      {/* Halo Score if played */}
      {kellerState.haloScore !== null && (
        <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
          Halo: +{kellerState.haloScore}
        </Badge>
      )}

      {/* Brucie Multiplier */}
      {kellerState.brucieMultiplier !== 2 && (
        <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-700 dark:text-green-300">
          R13: {kellerState.brucieMultiplier}x
        </Badge>
      )}
    </div>
  );
}
