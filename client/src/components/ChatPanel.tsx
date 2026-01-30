import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  messages: ChatMessage[];
  currentPlayerId: string | null;
  unreadCount: number;
  onSendMessage: (text: string) => void;
  onClearUnread: () => void;
}

export function ChatPanel({
  messages,
  currentPlayerId,
  unreadCount,
  onSendMessage,
  onClearUnread,
}: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Clear unread when opening
  useEffect(() => {
    if (isOpen) {
      onClearUnread();
    }
  }, [isOpen, onClearUnread]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

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

      {/* Mobile chat modal */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background/95 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Chat
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <div ref={scrollRef} className="h-full overflow-y-auto p-3 space-y-2">
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No messages yet
                </p>
              ) : (
                messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    isOwnMessage={msg.playerId === currentPlayerId}
                    formatTime={formatTime}
                  />
                ))
              )}
            </div>
          </div>
          <div className="p-3 border-t flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              maxLength={200}
            />
            <Button onClick={handleSend} disabled={!inputValue.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-64 border-l bg-card h-full">
        <div className="p-3 border-b">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <MessageCircle className="w-4 h-4" />
            Chat
          </h2>
        </div>
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-2">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground text-xs py-4">
                No messages yet
              </p>
            ) : (
              messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  isOwnMessage={msg.playerId === currentPlayerId}
                  formatTime={formatTime}
                  compact
                />
              ))
            )}
          </div>
        </ScrollArea>
        <div className="p-2 border-t flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            maxLength={200}
            className="text-sm h-8"
          />
          <Button size="sm" onClick={handleSend} disabled={!inputValue.trim()}>
            <Send className="w-3 h-3" />
          </Button>
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
}

function ChatBubble({ message, isOwnMessage, formatTime, compact }: ChatBubbleProps) {
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
            : "bg-muted",
          compact && "px-2 py-1"
        )}
      >
        {!isOwnMessage && (
          <p className={cn(
            "font-medium text-xs mb-0.5",
            isOwnMessage ? "text-primary-foreground/80" : "text-muted-foreground"
          )}>
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
