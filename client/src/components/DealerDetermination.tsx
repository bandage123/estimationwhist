import { useState, useEffect, useRef } from "react";
import { Card as CardType, Player } from "@shared/schema";
import { PlayingCard } from "./PlayingCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Spade } from "lucide-react";

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
  const [revealedCount, setRevealedCount] = useState(0);
  const lastDealerCardsRef = useRef<string>("");

  // Create a unique identifier for the current dealer cards set
  const dealerCardsId = dealerCards.map(dc => `${dc.playerId}-${dc.card.suit}-${dc.card.rank}`).join(",");

  // Reset revealed count when a new set of cards is dealt (including ties)
  useEffect(() => {
    if (dealerCardsId !== lastDealerCardsRef.current) {
      lastDealerCardsRef.current = dealerCardsId;
      setRevealedCount(0);
    }
  }, [dealerCardsId]);

  // Reveal cards one at a time with animation
  useEffect(() => {
    if (dealerCards.length === 0) {
      return;
    }

    if (revealedCount < players.length) {
      const timer = setTimeout(() => {
        setRevealedCount(prev => prev + 1);
      }, 400); // 400ms delay between each card reveal

      return () => clearTimeout(timer);
    }
  }, [dealerCards.length, revealedCount, players.length]);

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
            {players.map((player, index) => {
              const cardDraw = dealerCards.find(dc => dc.playerId === player.id);
              const isDealer = dealer?.id === player.id;
              const isRevealed = index < revealedCount;
              const showCard = cardDraw && isRevealed;

              return (
                <div
                  key={player.id}
                  className="flex flex-col items-center gap-2"
                  data-testid={`dealer-card-${player.name}`}
                >
                  <div className="relative">
                    {showCard ? (
                      <div className="animate-in fade-in zoom-in duration-300">
                        <PlayingCard card={cardDraw.card} size="lg" />
                      </div>
                    ) : (
                      <div className="w-20 h-28 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20">
                        {cardDraw && !isRevealed ? (
                          <div className="w-16 h-24 rounded-md bg-primary/20 border-2 border-primary/40 flex items-center justify-center">
                            <Spade className="w-8 h-8 text-primary/60" />
                          </div>
                        ) : (
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    )}
                    {isDealer && isRevealed && (
                      <Badge
                        variant="default"
                        className="absolute -top-2 -right-2 animate-bounce"
                        data-testid="badge-dealer"
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

          {dealer && revealedCount >= players.length && (
            <div className="text-center p-4 rounded-lg bg-primary/10 animate-in fade-in duration-500">
              <p className="text-lg">
                <span className="font-bold text-primary">{dealer.name}</span> is the dealer!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                The game will begin shortly...
              </p>
            </div>
          )}

          {!dealer && dealerCards.length === players.length && revealedCount >= players.length && (
            <div className="text-center p-4 rounded-lg bg-muted animate-in fade-in">
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
