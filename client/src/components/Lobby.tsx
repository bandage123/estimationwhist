import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Copy, CheckCircle, Loader2, Bot, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Player } from "@shared/schema";

interface LobbyCreateProps {
  onCreateGame: (playerName: string) => void;
  onCreateSinglePlayerGame: (playerName: string, cpuCount: number) => void;
  onJoinGame: (gameId: string, playerName: string) => void;
  isConnecting: boolean;
}

export function LobbyCreate({ onCreateGame, onCreateSinglePlayerGame, onJoinGame, isConnecting }: LobbyCreateProps) {
  const [playerName, setPlayerName] = useState("");
  const [gameId, setGameId] = useState("");
  const [mode, setMode] = useState<"single" | "multi" | "join" | null>(null);
  const [cpuCount, setCpuCount] = useState("3");

  const handleCreateMultiplayer = () => {
    if (playerName.trim()) {
      onCreateGame(playerName.trim());
    }
  };

  const handleCreateSinglePlayer = () => {
    if (playerName.trim()) {
      onCreateSinglePlayerGame(playerName.trim(), parseInt(cpuCount));
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
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="default"
                  onClick={() => setMode("single")}
                  disabled={!playerName.trim()}
                  className="h-auto py-4 flex flex-col gap-2"
                  data-testid="button-single-mode"
                >
                  <Bot className="w-5 h-5" />
                  <span>Single Player</span>
                  <span className="text-xs opacity-70">Play vs CPU</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMode("multi")}
                  disabled={!playerName.trim()}
                  className="h-auto py-4 flex flex-col gap-2"
                  data-testid="button-multi-mode"
                >
                  <Globe className="w-5 h-5" />
                  <span>Multiplayer</span>
                  <span className="text-xs opacity-70">Play with friends</span>
                </Button>
              </div>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setMode("join")}
                disabled={!playerName.trim()}
                data-testid="button-join-mode"
              >
                Join existing game
              </Button>
            </div>
          ) : mode === "single" ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-5 h-5 text-primary" />
                  <span className="font-medium">Single Player Mode</span>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Number of CPU opponents</label>
                  <Select value={cpuCount} onValueChange={setCpuCount}>
                    <SelectTrigger data-testid="select-cpu-count">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 opponent</SelectItem>
                      <SelectItem value="2">2 opponents</SelectItem>
                      <SelectItem value="3">3 opponents</SelectItem>
                      <SelectItem value="4">4 opponents</SelectItem>
                      <SelectItem value="5">5 opponents</SelectItem>
                      <SelectItem value="6">6 opponents</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleCreateSinglePlayer}
                disabled={!playerName.trim() || isConnecting}
                data-testid="button-start-single-player"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  `Start Game vs ${cpuCount} CPU${parseInt(cpuCount) > 1 ? 's' : ''}`
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
          ) : mode === "multi" ? (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <span className="font-medium">Multiplayer Mode</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Create a game and share the code with friends to join.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={handleCreateMultiplayer}
                disabled={!playerName.trim() || isConnecting}
                data-testid="button-create-game"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Multiplayer Game"
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
  isSinglePlayer?: boolean;
  minPlayers?: number;
  maxPlayers?: number;
}

export function LobbyWaiting({
  gameId,
  players,
  isHost,
  onStartGame,
  isSinglePlayer = false,
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
  const humanPlayers = players.filter(p => !p.isCPU);
  const cpuPlayers = players.filter(p => p.isCPU);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {isSinglePlayer ? (
              <Badge variant="secondary">
                <Bot className="w-3 h-3 mr-1" />
                Single Player
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Globe className="w-3 h-3 mr-1" />
                Multiplayer
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl">
            {isSinglePlayer ? "Ready to Play" : "Waiting for Players"}
          </CardTitle>
          <CardDescription>
            {isSinglePlayer 
              ? "You're playing against CPU opponents" 
              : "Share the game code with friends to invite them"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSinglePlayer && (
            <>
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
            </>
          )}

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
              {humanPlayers.map((player, index) => (
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
              
              {cpuPlayers.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mt-3 mb-2">
                    <Bot className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">CPU OPPONENTS</span>
                  </div>
                  {cpuPlayers.map((player) => (
                    <div
                      key={player.id}
                      data-testid={`lobby-cpu-${player.name}`}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm">
                          <Bot className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium text-muted-foreground">{player.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">CPU</Badge>
                    </div>
                  ))}
                </>
              )}
            </div>

            {!isSinglePlayer && players.length < minPlayers && (
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
              {isSinglePlayer 
                ? `Start Game` 
                : `Start Game (${players.length} players)`}
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
