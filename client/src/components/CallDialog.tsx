import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EyeOff, AlertTriangle } from "lucide-react";

interface CallDialogProps {
  cardCount: number;
  currentCalls: { playerName: string; call: number; isBlindCalling?: boolean }[];
  isDealer: boolean;
  onMakeCall: (call: number) => void;
  playerName: string;
  isBlindCalling?: boolean;
  cannotCallZero?: boolean;
}

export function CallDialog({
  cardCount,
  currentCalls,
  isDealer,
  onMakeCall,
  playerName,
  isBlindCalling = false,
  cannotCallZero = false,
}: CallDialogProps) {
  const [selectedCall, setSelectedCall] = useState<number | null>(null);

  const totalCalled = currentCalls.reduce((sum, c) => sum + c.call, 0);
  const forbiddenCall = isDealer ? cardCount - totalCalled : null;

  const possibleCalls = Array.from({ length: cardCount + 1 }, (_, i) => i);

  const handleConfirm = () => {
    if (selectedCall !== null) {
      onMakeCall(selectedCall);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Your Turn to Call</CardTitle>
        <CardDescription>
          {playerName}, how many tricks do you think you'll win?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentCalls.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Current calls:</p>
            <div className="flex flex-wrap gap-2">
              {currentCalls.map((c, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className={cn(c.isBlindCalling && "bg-purple-500/20 border-purple-500/30")}
                >
                  {c.isBlindCalling && <EyeOff className="w-3 h-3 mr-1" />}
                  {c.playerName}: {c.call}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Total called: {totalCalled} / {cardCount} tricks
            </p>
          </div>
        )}

        {/* Blind Calling Warning */}
        {isBlindCalling && (
          <div className="p-3 rounded-md bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <EyeOff className="w-4 h-4" />
              <p className="text-sm font-medium">
                Blind Round! You cannot see your cards.
              </p>
            </div>
          </div>
        )}

        {/* No3Z Warning */}
        {cannotCallZero && (
          <div className="p-3 rounded-md bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <AlertTriangle className="w-4 h-4" />
              <p className="text-sm font-medium">
                No3Z Rule! You cannot call 0 (called 0 twice in a row)
              </p>
            </div>
          </div>
        )}

        {isDealer && forbiddenCall !== null && forbiddenCall >= 0 && forbiddenCall <= cardCount && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">
              As the dealer, you cannot call <strong>{forbiddenCall}</strong> (this would make the total equal to {cardCount})
            </p>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          {possibleCalls.map((call) => {
            const isForbiddenDealer = isDealer && call === forbiddenCall;
            const isForbiddenNo3Z = cannotCallZero && call === 0;
            const isForbidden = isForbiddenDealer || isForbiddenNo3Z;
            const isSelected = selectedCall === call;

            return (
              <Button
                key={call}
                variant={isSelected ? "default" : "outline"}
                disabled={isForbidden}
                onClick={() => setSelectedCall(call)}
                data-testid={`call-button-${call}`}
                className={cn(
                  "h-12 text-lg font-bold",
                  isForbidden && "opacity-50 cursor-not-allowed line-through"
                )}
              >
                {call}
              </Button>
            );
          })}
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={selectedCall === null}
          onClick={handleConfirm}
          data-testid="confirm-call-button"
        >
          Confirm Call: {selectedCall ?? "?"}
        </Button>
      </CardContent>
    </Card>
  );
}
