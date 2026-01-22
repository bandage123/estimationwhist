import { Card as CardType, Player } from "@shared/schema";
import { PlayingCard } from "./PlayingCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface DealerDeterminationProps {
  dealerCards: { playerId: string; card: CardType }[];
  players: Player[];
  dealerIndex: number | null;
}

export function DealerDetermination({
  dealerCards,
  players,
  dealerIndex,
}: DealerDeterminationProps) {
  const dealer = dealerIndex !== null ? players[dealerIndex] : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-serif">Determining the Dealer</CardTitle>
          <CardDescription>
            Each player draws a card. The highest card (Ace high, 2 low) becomes the dealer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap justify-center gap-6">
            {players.map((player) => {
              const cardDraw = dealerCards.find(dc => dc.playerId === player.id);
              const isDealer = dealer?.id === player.id;

              return (
                <div
                  key={player.id}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="relative">
                    {cardDraw ? (
                      <PlayingCard card={cardDraw.card} size="lg" />
                    ) : (
                      <div className="w-20 h-28 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {isDealer && (
                      <Badge
                        variant="default"
                        className="absolute -top-2 -right-2 animate-bounce"
                      >
                        Dealer!
                      </Badge>
                    )}
                  </div>
                  <span className="font-medium text-sm">{player.name}</span>
                </div>
              );
            })}
          </div>

          {dealer && (
            <div className="text-center p-4 rounded-lg bg-primary/10">
              <p className="text-lg">
                <span className="font-bold text-primary">{dealer.name}</span> is the dealer!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                The game will begin shortly...
              </p>
            </div>
          )}

          {!dealer && dealerCards.length === players.length && (
            <div className="text-center p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">
                It's a tie! Drawing new cards...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
