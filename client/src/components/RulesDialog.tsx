import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HelpCircle } from "lucide-react";
import { GameFormat } from "@shared/schema";

interface RulesDialogProps {
  gameFormat: GameFormat;
}

export function RulesDialog({ gameFormat }: RulesDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          <HelpCircle className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {gameFormat === "keller" ? "Keller Rules" : "Game Rules"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-1">Objective</h3>
              <p className="text-muted-foreground">
                Win exactly the number of tricks you bid each round. Score points
                for hitting your bid, lose points for missing.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-1">Rounds</h3>
              <p className="text-muted-foreground">
                13 rounds with varying card counts (7→1→7) and rotating trump suits.
                The final round is worth double points.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-1">Calling</h3>
              <p className="text-muted-foreground">
                After seeing your cards, bid how many tricks you'll win. The dealer
                cannot make a bid that would make the total bids equal the card count
                (someone must miss).
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-1">Playing</h3>
              <p className="text-muted-foreground">
                Follow the lead suit if possible. Trump beats other suits. Highest
                card of the lead suit (or trump) wins the trick.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-1">Scoring</h3>
              <p className="text-muted-foreground">
                Hit your bid: 10 + tricks won.<br />
                Over your bid: Just the tricks won (no bonus).<br />
                Under your bid: 0 points.
              </p>
            </section>

            {gameFormat === "keller" && (
              <>
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold text-primary mb-2">Keller Special Rules</h3>
                </div>

                <section>
                  <h3 className="font-semibold mb-1">No3Z (No Three Zeros)</h3>
                  <p className="text-muted-foreground">
                    You cannot bid zero three times in a row. If you've bid zero
                    twice consecutively, you must bid at least 1.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold mb-1">Three Blind Mice</h3>
                  <p className="text-muted-foreground">
                    You must complete 3 "blind" rounds during the game where you
                    bid without seeing your cards. You can choose when to go blind,
                    but if you haven't started by round 11, it triggers automatically.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold mb-1">One Swap One Time</h3>
                  <p className="text-muted-foreground">
                    Once per game, during the calling phase, you can swap one card
                    from your hand for a random card from the deck.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold mb-1">Halo (After Round 7)</h3>
                  <p className="text-muted-foreground">
                    Higher/Lower/Same guessing game. Guess correctly up to 7 times.
                    Your score = correct guesses squared (max 49 points). You can
                    bank anytime to keep your points.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold mb-1">Brucie Bonus (After Round 12)</h3>
                  <p className="text-muted-foreground">
                    Higher/Lower game for your final round multiplier. Skip to get the safe 2x multiplier.
                    If you play, each correct guess adds 1x to your multiplier (starting from 1x), up to a maximum of 3x.
                  </p>
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
