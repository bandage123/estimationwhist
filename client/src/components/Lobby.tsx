import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Copy, CheckCircle, Loader2, Bot, Globe, Trophy, Flag, Medal, Save, Trash2, Play, X, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Player, GameFormat, GameState } from "@shared/schema";
import { HighScores } from "./HighScores";
import { JokerLogo } from "./JokerLogo";
import { getSavedGames, deleteSavedGame, formatSaveDate, SavedGame, getAutoSavedGame, clearAutoSave } from "@/lib/savedGames";

// Inline a few countries and adjectives for the selector
const COUNTRIES_SELECT = [
  { name: "United Kingdom", code: "GB" },
  { name: "United States", code: "US" },
  { name: "France", code: "FR" },
  { name: "Germany", code: "DE" },
  { name: "Spain", code: "ES" },
  { name: "Italy", code: "IT" },
  { name: "Brazil", code: "BR" },
  { name: "Japan", code: "JP" },
  { name: "Australia", code: "AU" },
  { name: "Canada", code: "CA" },
  { name: "Argentina", code: "AR" },
  { name: "Mexico", code: "MX" },
  { name: "India", code: "IN" },
  { name: "China", code: "CN" },
  { name: "South Korea", code: "KR" },
];


interface LobbyCreateProps {
  onCreateGame: (playerName: string, gameFormat?: GameFormat) => void;
  onCreateSinglePlayerGame: (playerName: string, cpuCount: number, gameFormat?: GameFormat) => void;
  onCreateOlympicsGame: (playerName: string, countryCode?: string, gameFormat?: GameFormat) => void;
  onJoinGame: (gameId: string, playerName: string) => void;
  onRestoreSavedGame: (savedState: GameState, saveId: string) => void;
  isConnecting: boolean;
}

export function LobbyCreate({ onCreateGame, onCreateSinglePlayerGame, onCreateOlympicsGame, onJoinGame, onRestoreSavedGame, isConnecting }: LobbyCreateProps) {
  const [playerName, setPlayerNameRaw] = useState(() => localStorage.getItem("whist_player_name") || "");
  const setPlayerName = (name: string) => {
    setPlayerNameRaw(name);
    localStorage.setItem("whist_player_name", name);
  };
  const [gameId, setGameId] = useState("");
  const [mode, setMode] = useState<"single" | "tournament" | "olympics" | "multi" | "join" | "saved" | null>(null);
  const [cpuCount, setCpuCount] = useState("3");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [gameFormat, setGameFormat] = useState<GameFormat>("traditional");
  const [selectedTournament, setSelectedTournament] = useState("");
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [autoSavedGame, setAutoSavedGame] = useState<SavedGame | null>(null);

  // Load saved games and auto-saved game on mount
  useEffect(() => {
    if (mode === "saved" || mode === null) {
      setSavedGames(getSavedGames());
    }
    // Check for auto-saved game
    const autoSave = getAutoSavedGame();
    setAutoSavedGame(autoSave);
    // Pre-fill player name from auto-save if available
    if (autoSave && !playerName) {
      setPlayerName(autoSave.playerName);
    }
  }, [mode]);

  const handleDismissAutoSave = () => {
    clearAutoSave();
    setAutoSavedGame(null);
  };

  const handleResumeAutoSave = () => {
    if (autoSavedGame) {
      onRestoreSavedGame(autoSavedGame.gameState, autoSavedGame.id);
    }
  };

  const handleDeleteSave = (id: string) => {
    deleteSavedGame(id);
    setSavedGames(getSavedGames());
  };

  const handleLoadSave = (save: SavedGame) => {
    onRestoreSavedGame(save.gameState, save.id);
  };

  const handleCreateMultiplayer = () => {
    if (playerName.trim()) {
      onCreateGame(playerName.trim(), gameFormat);
    }
  };

  const handleCreateSinglePlayer = () => {
    if (playerName.trim()) {
      onCreateSinglePlayerGame(playerName.trim(), parseInt(cpuCount), gameFormat);
    }
  };

  const handleCreateOlympics = () => {
    if (playerName.trim()) {
      onCreateOlympicsGame(
        playerName.trim(),
        selectedCountry && selectedCountry !== "random" ? selectedCountry : undefined,
        gameFormat
      );
    }
  };

  const handleJoin = () => {
    if (playerName.trim() && gameId.trim()) {
      onJoinGame(gameId.trim().toUpperCase(), playerName.trim());
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background overflow-y-auto">
      <div className="w-full max-w-md space-y-4 my-auto">
        <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <JokerLogo size={80} />
          </div>
          <CardTitle className="text-2xl font-serif">Estimation Whist</CardTitle>
          <CardDescription>
            A classic trick-taking card game for 2-7 players
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-saved game resume banner */}
          {autoSavedGame && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <Play className="w-4 h-4" />
                  <span className="text-sm font-medium">Game in progress</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={handleDismissAutoSave}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {autoSavedGame.isOlympics ? "World Cup" : autoSavedGame.gameFormat === "keller" ? "Keller" : "Traditional"} •
                Round {autoSavedGame.currentRound} •
                Score: {autoSavedGame.playerScore} •
                {formatSaveDate(autoSavedGame.savedAt)}
              </p>
              <Button
                className="w-full gap-2"
                onClick={handleResumeAutoSave}
                disabled={isConnecting}
              >
                {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Resume Game
              </Button>
            </div>
          )}

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
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setMode("single")}
                  disabled={!playerName.trim()}
                  className="w-full h-auto py-4 flex flex-col gap-2 border-2 hover:bg-primary/10 hover:border-primary"
                  data-testid="button-single-mode"
                >
                  <Bot className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Single Player Game</span>
                  <span className="text-xs opacity-70">Play vs CPU</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMode("tournament")}
                  disabled={!playerName.trim()}
                  className="w-full h-auto py-4 flex flex-col gap-2 border-2 hover:bg-primary/10 hover:border-primary"
                  data-testid="button-tournament-mode"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    <Medal className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-semibold">Tournaments</span>
                  <span className="text-xs opacity-70">Play in the World Cup and Other Events</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMode("multi")}
                  disabled={!playerName.trim()}
                  className="w-full h-auto py-4 flex flex-col gap-2 border-2 hover:bg-primary/10 hover:border-primary"
                  data-testid="button-multi-mode"
                >
                  <Globe className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Multiplayer</span>
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
                Join existing multiplayer game
              </Button>
              {savedGames.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setMode("saved")}
                >
                  <Save className="w-4 h-4" />
                  Continue Saved Game ({savedGames.length})
                </Button>
              )}
            </div>
          ) : mode === "saved" ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Save className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-sm">Saved Games</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Continue where you left off
                </p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {savedGames.map((save) => (
                  <div
                    key={save.id}
                    className="p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{save.playerName}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {save.gameFormat}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>
                            {save.isOlympics ? (
                              <>World Cup - {save.olympicsPhase === "finals" ? "Finals" : `Group ${save.groupNumber}`}</>
                            ) : (
                              <>Round {save.currentRound}/13</>
                            )}
                          </div>
                          <div>Score: {save.playerScore} pts</div>
                          <div>{formatSaveDate(save.savedAt)}</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs"
                          onClick={() => handleLoadSave(save)}
                        >
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleDeleteSave(save.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setMode(null)}
              >
                Back
              </Button>
            </div>
          ) : mode === "tournament" ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium text-sm">Tournaments</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Compete in special tournament events!
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Choose Tournament</label>
                <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select a tournament" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="world-cup">The Whist World Cup</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground italic">More Tournaments to Come!</p>
              </div>

              <Button
                className="w-full"
                size="sm"
                onClick={() => {
                  if (selectedTournament === "world-cup") {
                    setMode("olympics");
                  }
                }}
                disabled={!playerName.trim() || !selectedTournament}
              >
                Continue
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setMode(null);
                  setSelectedTournament("");
                }}
              >
                Back
              </Button>
            </div>
          ) : mode === "olympics" ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium text-sm">The Whist World Cup</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  49 countries, 7 tables, winners advance to finals!
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Country</label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Random" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    <SelectItem value="random">Random</SelectItem>
                    {COUNTRIES_SELECT.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="font-mono mr-1">{c.code}</span> {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Game Format</label>
                <Select value={gameFormat} onValueChange={(v) => setGameFormat(v as GameFormat)}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-game-format-olympics">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="traditional">Traditional</SelectItem>
                    <SelectItem value="keller">Keller Rules</SelectItem>
                  </SelectContent>
                </Select>
                {gameFormat === "keller" && (
                  <p className="text-[10px] text-muted-foreground">
                    Includes: No3Z, Blind Mice, Swap, Halo & Brucie
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                size="sm"
                onClick={handleCreateOlympics}
                disabled={!playerName.trim() || isConnecting}
                data-testid="button-start-olympics"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  "Enter The Whist World Cup"
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setMode("tournament")}
              >
                Back
              </Button>
            </div>
          ) : mode === "single" ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-5 h-5 text-primary" />
                  <span className="font-medium">Single Player Mode</span>
                </div>
                <div className="space-y-3">
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
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Game Format</label>
                    <Select value={gameFormat} onValueChange={(v) => setGameFormat(v as GameFormat)}>
                      <SelectTrigger data-testid="select-game-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="traditional">Traditional</SelectItem>
                        <SelectItem value="keller">Keller Rules</SelectItem>
                      </SelectContent>
                    </Select>
                    {gameFormat === "keller" && (
                      <p className="text-xs text-muted-foreground">
                        Includes: No3Z, Three Blind Mice, One Swap One Time, Halo & Brucie Bonus
                      </p>
                    )}
                  </div>
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
                <p className="text-sm text-muted-foreground mb-3">
                  Create a game and share the code with friends to join.
                </p>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Game Format</label>
                  <Select value={gameFormat} onValueChange={(v) => setGameFormat(v as GameFormat)}>
                    <SelectTrigger data-testid="select-game-format-multi">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="traditional">Traditional</SelectItem>
                      <SelectItem value="keller">Keller Rules</SelectItem>
                    </SelectContent>
                  </Select>
                  {gameFormat === "keller" && (
                    <p className="text-xs text-muted-foreground">
                      Includes: No3Z, Three Blind Mice, One Swap One Time, Halo & Brucie Bonus
                    </p>
                  )}
                </div>
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

      {/* Show high scores on main menu */}
      {mode === null && (
        <HighScores />
      )}
      </div>
    </div>
  );
}

interface LobbyWaitingProps {
  gameId: string;
  players: Player[];
  isHost: boolean;
  onStartGame: () => void;
  isSinglePlayer?: boolean;
  isOlympics?: boolean;
  olympicsGroupNumber?: number;
  minPlayers?: number;
  maxPlayers?: number;
}

// Helper to convert country code to flag emoji
const countryCodeToFlag = (code: string) => {
  if (!code || code.length !== 2) return '';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export function LobbyWaiting({
  gameId,
  players,
  isHost,
  onStartGame,
  isSinglePlayer = false,
  isOlympics = false,
  olympicsGroupNumber = 1,
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

  const shareGameCode = async () => {
    const shareData = {
      title: "Join my Estimation Whist game!",
      text: `Join my game with code: ${gameId}`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed - fall back to copy
        if ((err as Error).name !== "AbortError") {
          copyGameCode();
        }
      }
    } else {
      // Web Share API not supported - fall back to copy
      copyGameCode();
    }
  };

  const canStart = players.length >= minPlayers;
  const humanPlayers = players.filter(p => !p.isCPU);
  const cpuPlayers = players.filter(p => p.isCPU);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {isOlympics ? (
              <Badge variant="secondary" className="bg-yellow-500/10 border-yellow-500/30">
                <Trophy className="w-3 h-3 mr-1 text-yellow-500" />
                World Cup - Group {olympicsGroupNumber}
              </Badge>
            ) : isSinglePlayer ? (
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
            {isOlympics ? "The Whist World Cup" : isSinglePlayer ? "Ready to Play" : "Waiting for Players"}
          </CardTitle>
          <CardDescription>
            {isOlympics
              ? "7 countries compete - winner advances to finals"
              : isSinglePlayer 
              ? "You're playing against CPU opponents" 
              : "Share the game code with friends to invite them"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSinglePlayer && !isOlympics && (
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
                <Button
                  variant="outline"
                  size="icon"
                  onClick={shareGameCode}
                  data-testid="button-share-code"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              <Separator />
            </>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOlympics ? (
                  <Flag className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Users className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{isOlympics ? "Countries" : "Players"}</span>
              </div>
              <Badge variant="secondary">
                {players.length}/{maxPlayers}
              </Badge>
            </div>

            <div className="space-y-2">
              {/* Olympics mode - show all players as countries */}
              {isOlympics ? (
                players.map((player) => (
                  <div
                    key={player.id}
                    data-testid={`lobby-player-${player.name}`}
                    className={`flex items-center justify-between p-2 rounded-md ${
                      !player.isCPU ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{countryCodeToFlag(player.countryCode || '')}</span>
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${!player.isCPU ? '' : 'text-muted-foreground'}`}>
                          {player.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{player.countryName}</span>
                      </div>
                    </div>
                    {!player.isCPU && (
                      <Badge variant="default" className="text-xs">You</Badge>
                    )}
                  </div>
                ))
              ) : (
                <>
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
              {isOlympics 
                ? `Begin Group ${olympicsGroupNumber}` 
                : isSinglePlayer 
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
