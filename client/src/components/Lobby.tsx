import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Copy, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Player } from "@shared/schema";

interface LobbyCreateProps {
  onCreateGame: (playerName: string) => void;
  onJoinGame: (gameId: string, playerName: string) => void;
  isConnecting: boolean;
}

export function LobbyCreate({ onCreateGame, onJoinGame, isConnecting }: LobbyCreateProps) {
  const [playerName, setPlayerName] = useState("");
  const [gameId, setGameId] = useState("");
  const [mode, setMode] = useState<"create" | "join" | null>(null);

  const handleCreate = () => {
    if (playerName.trim()) {
      onCreateGame(playerName.trim());
    }
  };

  const handleJoin = () => {
    if (playerName.trim() && gameId.trim()) {
      onJoinGame(gameId.trim().toUpperCase(), playerName.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-3xl">🃏</span>
          </div>
          <CardTitle className="text-2xl font-serif">Estimation Whist</CardTitle>
          <CardDescription>
            A classic trick-taking card game for 2-7 players
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Name</label>
            <Input
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              data-testid="input-player-name"
            />
          </div>

          {mode === null ? (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="default"
                onClick={() => setMode("create")}
                disabled={!playerName.trim()}
                data-testid="button-create-mode"
              >
                Create Game
              </Button>
              <Button
                variant="outline"
                onClick={() => setMode("join")}
                disabled={!playerName.trim()}
                data-testid="button-join-mode"
              >
                Join Game
              </Button>
            </div>
          ) : mode === "create" ? (
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={!playerName.trim() || isConnecting}
                data-testid="button-create-game"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create New Game"
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setMode(null)}
              >
                Back
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Game Code</label>
                <Input
                  placeholder="Enter game code"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="uppercase tracking-widest text-center text-lg font-mono"
                  data-testid="input-game-code"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleJoin}
                disabled={!playerName.trim() || !gameId.trim() || isConnecting}
                data-testid="button-join-game"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Game"
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setMode(null)}
              >
                Back
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface LobbyWaitingProps {
  gameId: string;
  players: Player[];
  isHost: boolean;
  onStartGame: () => void;
  minPlayers?: number;
  maxPlayers?: number;
}

export function LobbyWaiting({
  gameId,
  players,
  isHost,
  onStartGame,
  minPlayers = 2,
  maxPlayers = 7,
}: LobbyWaitingProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyGameCode = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    toast({
      title: "Code copied!",
      description: "Share this code with your friends to join.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const canStart = players.length >= minPlayers;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Waiting for Players</CardTitle>
          <CardDescription>
            Share the game code with friends to invite them
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center gap-2">
            <div className="px-6 py-3 bg-muted rounded-lg">
              <span className="text-3xl font-mono font-bold tracking-widest" data-testid="text-game-code">
                {gameId}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={copyGameCode}
              data-testid="button-copy-code"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Players</span>
              </div>
              <Badge variant="secondary">
                {players.length}/{maxPlayers}
              </Badge>
            </div>

            <div className="space-y-2">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  data-testid={`lobby-player-${player.name}`}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{player.name}</span>
                  </div>
                  {index === 0 && (
                    <Badge variant="outline" className="text-xs">Host</Badge>
                  )}
                </div>
              ))}
            </div>

            {players.length < minPlayers && (
              <p className="text-sm text-muted-foreground text-center">
                Waiting for at least {minPlayers} players to start...
              </p>
            )}
          </div>

          {isHost && (
            <Button
              className="w-full"
              size="lg"
              disabled={!canStart}
              onClick={onStartGame}
              data-testid="button-start-game"
            >
              Start Game ({players.length} players)
            </Button>
          )}

          {!isHost && (
            <p className="text-sm text-muted-foreground text-center">
              Waiting for the host to start the game...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
