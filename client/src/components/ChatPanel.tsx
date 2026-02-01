import { useState, useRef, useEffect } from "react";
import { ChatMessage, ProvisionalSuggestion, Player } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MessageCircle, Send, X, AlertTriangle, ThumbsUp, ThumbsDown, Check, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  messages: ChatMessage[];
  currentPlayerId: string | null;
  players: Player[];
  unreadCount: number;
  onSendMessage: (text: string) => void;
  onClearUnread: () => void;
  provisionalSuggestions: ProvisionalSuggestion[];
  onSuggestProvisional: (targetId: string, reason: string) => void;
  onVoteProvisional: (suggestionId: string, vote: boolean) => void;
  // CPU chat mode props
  cpuChatMode?: boolean;
  cpuChatEnabled?: boolean;
  onToggleCpuChat?: (enabled: boolean) => void;
}

export function ChatPanel({
  messages,
  currentPlayerId,
  players,
  unreadCount,
  onSendMessage,
  onClearUnread,
  provisionalSuggestions,
  onSuggestProvisional,
  onVoteProvisional,
  cpuChatMode = false,
  cpuChatEnabled = true,
  onToggleCpuChat,
}: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showProvisionalForm, setShowProvisionalForm] = useState(false);
  const [provisionalTarget, setProvisionalTarget] = useState<string>("");
  const [provisionalReason, setProvisionalReason] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get other players (not current player, not CPU)
  const otherPlayers = players.filter(p => p.id !== currentPlayerId && !p.isCPU);

  // Sort provisional suggestions - unresolved first, then by timestamp
  const sortedSuggestions = [...provisionalSuggestions].sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sortedSuggestions]);

  // Clear unread when opening
  useEffect(() => {
    if (isOpen) {
      onClearUnread();
    }
  }, [isOpen, onClearUnread]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current && !showProvisionalForm) {
      inputRef.current.focus();
    }
  }, [isOpen, showProvisionalForm]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (text) {
      onSendMessage(text);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSubmitProvisional = () => {
    if (provisionalTarget && provisionalReason.trim()) {
      onSuggestProvisional(provisionalTarget, provisionalReason.trim());
      setShowProvisionalForm(false);
      setProvisionalTarget("");
      setProvisionalReason("");
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const hasVoted = (suggestion: ProvisionalSuggestion) => {
    if (!currentPlayerId) return false;
    return suggestion.votesFor.includes(currentPlayerId) || suggestion.votesAgainst.includes(currentPlayerId);
  };

  const renderProvisionalSuggestion = (suggestion: ProvisionalSuggestion, compact?: boolean) => {
    const voted = hasVoted(suggestion);
    const votedFor = currentPlayerId && suggestion.votesFor.includes(currentPlayerId);
    const votedAgainst = currentPlayerId && suggestion.votesAgainst.includes(currentPlayerId);
    const isResolved = suggestion.resolved;

    return (
      <div
        key={suggestion.id}
        className={cn(
          "rounded-lg border p-2",
          isResolved
            ? suggestion.applied
              ? "border-red-500/50 bg-red-500/10"
              : "border-muted bg-muted/30"
            : "border-yellow-500/50 bg-yellow-500/10",
          compact && "p-1.5"
        )}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className={cn(
            "shrink-0",
            compact ? "w-3 h-3 mt-0.5" : "w-4 h-4",
            isResolved
              ? suggestion.applied ? "text-red-500" : "text-muted-foreground"
              : "text-yellow-500"
          )} />
          <div className="flex-1 min-w-0">
            <p className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
              Provisional against {suggestion.targetName}
              {isResolved && (
                <span className={cn(
                  "ml-2 font-normal",
                  suggestion.applied ? "text-red-500" : "text-muted-foreground"
                )}>
                  - {suggestion.applied ? "Applied" : "Rejected"}
                </span>
              )}
            </p>
            <p className={cn("text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>
              by {suggestion.suggesterName}: "{suggestion.reason}"
            </p>
            <div className={cn("flex items-center gap-2 mt-1", compact && "mt-0.5")}>
              <span className={cn("text-muted-foreground", compact ? "text-[9px]" : "text-xs")}>
                {suggestion.votesFor.length} for / {suggestion.votesAgainst.length} against
              </span>
              {!isResolved && !voted && suggestion.suggesterId !== currentPlayerId && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn("h-6 px-2", compact && "h-5 px-1")}
                    onClick={() => onVoteProvisional(suggestion.id, true)}
                  >
                    <ThumbsUp className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn("h-6 px-2", compact && "h-5 px-1")}
                    onClick={() => onVoteProvisional(suggestion.id, false)}
                  >
                    <ThumbsDown className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
                  </Button>
                </div>
              )}
              {voted && (
                <span className={cn(
                  "flex items-center gap-1",
                  compact ? "text-[9px]" : "text-xs",
                  votedFor ? "text-green-500" : "text-red-500"
                )}>
                  <Check className="w-3 h-3" />
                  Voted {votedFor ? "for" : "against"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProvisionalForm = (compact?: boolean) => (
    <div className={cn("space-y-2 p-2 border rounded-lg bg-muted/50", compact && "p-1.5 space-y-1.5")}>
      <div className="flex items-center justify-between">
        <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>Suggest Provisional</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setShowProvisionalForm(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <Select value={provisionalTarget} onValueChange={setProvisionalTarget}>
        <SelectTrigger className={cn(compact ? "h-7 text-xs" : "h-8 text-sm")}>
          <SelectValue placeholder="Select player..." />
        </SelectTrigger>
        <SelectContent>
          {otherPlayers.map(p => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={provisionalReason}
        onChange={(e) => setProvisionalReason(e.target.value)}
        placeholder="Reason for provisional..."
        maxLength={200}
        className={cn(compact ? "h-7 text-xs" : "h-8 text-sm")}
      />
      <Button
        size="sm"
        className={cn("w-full", compact && "h-7 text-xs")}
        onClick={handleSubmitProvisional}
        disabled={!provisionalTarget || !provisionalReason.trim()}
      >
        Submit
      </Button>
    </div>
  );

  return (
    <>
      {/* Floating button for mobile */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="rounded-full w-14 h-14 shadow-lg relative"
          >
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        )}
      </div>

      {/* Mobile chat modal - bottom half of screen */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsOpen(false)}
          />
          <div className="md:hidden fixed inset-x-0 bottom-0 h-1/2 z-50 bg-background border-t shadow-lg flex flex-col rounded-t-xl">
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-3 pb-2">
            <h2 className="font-semibold flex items-center gap-2">
              {cpuChatMode ? <Bot className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
              {cpuChatMode ? "CPU Chat" : "Chat"}
            </h2>
            <div className="flex items-center gap-2">
              {cpuChatMode && onToggleCpuChat && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {cpuChatEnabled ? "On" : "Off"}
                  </span>
                  <Switch
                    checked={cpuChatEnabled}
                    onCheckedChange={onToggleCpuChat}
                  />
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <div ref={scrollRef} className="h-full overflow-y-auto p-3 space-y-2">
              {/* Provisional suggestions (not in CPU chat mode) */}
              {!cpuChatMode && sortedSuggestions.map(s => renderProvisionalSuggestion(s))}

              {cpuChatMode && !cpuChatEnabled ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  CPU chat is disabled
                </p>
              ) : messages.length === 0 && (!cpuChatMode && sortedSuggestions.length === 0) ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  {cpuChatMode ? "CPUs will comment during the game" : "No messages yet"}
                </p>
              ) : messages.length === 0 && cpuChatMode ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  CPUs will comment during the game
                </p>
              ) : (
                messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    isOwnMessage={msg.playerId === currentPlayerId}
                    formatTime={formatTime}
                    isCPU={cpuChatMode && msg.playerId !== currentPlayerId}
                  />
                ))
              )}
            </div>
          </div>
          <div className="p-3 border-t space-y-2">
            {showProvisionalForm && !cpuChatMode ? (
              renderProvisionalForm()
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={cpuChatMode ? "Chat with CPUs..." : "Type a message..."}
                    maxLength={200}
                    disabled={cpuChatMode && !cpuChatEnabled}
                  />
                  <Button onClick={handleSend} disabled={!inputValue.trim() || (cpuChatMode && !cpuChatEnabled)}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {!cpuChatMode && otherPlayers.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-yellow-600 border-yellow-500/50 hover:bg-yellow-500/10"
                    onClick={() => setShowProvisionalForm(true)}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Suggest a Provisional
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        </>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-64 border-l bg-card h-full">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              {cpuChatMode ? <Bot className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
              {cpuChatMode ? "CPU Chat" : "Chat"}
            </h2>
            {cpuChatMode && onToggleCpuChat && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {cpuChatEnabled ? "On" : "Off"}
                </span>
                <Switch
                  checked={cpuChatEnabled}
                  onCheckedChange={onToggleCpuChat}
                  className="scale-75"
                />
              </div>
            )}
          </div>
        </div>
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-2">
            {/* Provisional suggestions (not in CPU chat mode) */}
            {!cpuChatMode && sortedSuggestions.map(s => renderProvisionalSuggestion(s, true))}

            {cpuChatMode && !cpuChatEnabled ? (
              <p className="text-center text-muted-foreground text-xs py-4">
                CPU chat is disabled
              </p>
            ) : messages.length === 0 && (!cpuChatMode && sortedSuggestions.length === 0) ? (
              <p className="text-center text-muted-foreground text-xs py-4">
                {cpuChatMode ? "CPUs will comment during the game" : "No messages yet"}
              </p>
            ) : messages.length === 0 && cpuChatMode ? (
              <p className="text-center text-muted-foreground text-xs py-4">
                CPUs will comment during the game
              </p>
            ) : (
              messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  isOwnMessage={msg.playerId === currentPlayerId}
                  formatTime={formatTime}
                  compact
                  isCPU={cpuChatMode && msg.playerId !== currentPlayerId}
                />
              ))
            )}
          </div>
        </ScrollArea>
        <div className="p-2 border-t space-y-1.5">
          {showProvisionalForm && !cpuChatMode ? (
            renderProvisionalForm(true)
          ) : (
            <>
              <div className="flex gap-1">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={cpuChatMode ? "Chat with CPUs..." : "Message..."}
                  maxLength={200}
                  className="text-sm h-7"
                  disabled={cpuChatMode && !cpuChatEnabled}
                />
                <Button size="sm" className="h-7" onClick={handleSend} disabled={!inputValue.trim() || (cpuChatMode && !cpuChatEnabled)}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
              {!cpuChatMode && otherPlayers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 gap-1 text-xs text-yellow-600 border-yellow-500/50 hover:bg-yellow-500/10"
                  onClick={() => setShowProvisionalForm(true)}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Suggest Provisional
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

interface ChatBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  formatTime: (timestamp: string) => string;
  compact?: boolean;
  isCPU?: boolean;
}

function ChatBubble({ message, isOwnMessage, formatTime, compact, isCPU }: ChatBubbleProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        isOwnMessage ? "items-end" : "items-start"
      )}
    >
      <div
        className={cn(
          "rounded-lg px-3 py-1.5 max-w-[85%]",
          isOwnMessage
            ? "bg-primary text-primary-foreground"
            : isCPU
              ? "bg-purple-500/20 border border-purple-500/30"
              : "bg-muted",
          compact && "px-2 py-1"
        )}
      >
        {!isOwnMessage && (
          <p className={cn(
            "font-medium text-xs mb-0.5 flex items-center gap-1",
            isOwnMessage ? "text-primary-foreground/80" : isCPU ? "text-purple-400" : "text-muted-foreground"
          )}>
            {isCPU && <Bot className="w-3 h-3" />}
            {message.playerName}
          </p>
        )}
        <p className={cn("break-words", compact ? "text-xs" : "text-sm")}>
          {message.text}
        </p>
      </div>
      <span className={cn(
        "text-muted-foreground mt-0.5",
        compact ? "text-[9px]" : "text-[10px]"
      )}>
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}
