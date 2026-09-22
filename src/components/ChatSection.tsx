import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { apiStreamPost } from "@/lib/api";

type Message = { role: "user" | "assistant"; content: string };

interface Props {
  conversationId: string | null;
  getMessages: (id: string) => Message[];
  saveMessages: (id: string, msgs: Message[]) => void;
  onFirstMessage?: (id: string, title: string) => void;
  onCreateConversation?: () => string;
}

export default function ChatSection({ conversationId, getMessages, saveMessages, onFirstMessage, onCreateConversation }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef(conversationId);
  useEffect(() => {
    activeIdRef.current = conversationId;
    if (conversationId) {
      setMessages(getMessages(conversationId));
    } else {
      setMessages([]);
    }
  }, [conversationId, getMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || isLoading) return;

    let currentId = conversationId;
    if (!currentId && onCreateConversation) {
      currentId = onCreateConversation();
      activeIdRef.current = currentId;
    }
    if (!currentId) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    setInput("");
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    saveMessages(currentId, newMessages);
    setIsLoading(true);

    // Update title on first user message
    if (messages.length === 0 && onFirstMessage) {
      onFirstMessage(currentId, userMsg.content.slice(0, 40));
    }

    let assistantSoFar = "";

    try {
      const resp = await apiStreamPost("/api/chat", { messages: newMessages });

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                const updated = last?.role === "assistant"
                  ? prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m)
                  : [...prev, { role: "assistant" as const, content: assistantSoFar }];
                if (activeIdRef.current) saveMessages(activeIdRef.current, updated);
                return updated;
              });
            }
          } catch {
            continue;
          }
        }
      }
    } catch (e) {
      console.error(e);
      const errMsg: Message = { role: "assistant", content: "Sorry, something went wrong. Please try again." };
      setMessages((prev) => {
        const updated = [...prev, errMsg];
        if (activeIdRef.current) saveMessages(activeIdRef.current, updated);
        return updated;
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md px-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">How can I help?</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Ask me about career paths, resume tips, interview prep, salary negotiation, or anything career-related.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {["Review my resume", "Career path advice", "Interview tips", "Salary negotiation"].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => setInput(hint)}
                    className="text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className="flex gap-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === "assistant" ? "bg-primary/15" : "bg-secondary"
                }`}>
                {msg.role === "assistant" ? (
                  <Bot className="w-4 h-4 text-primary" />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {msg.role === "assistant" ? "AI Career Agent" : "You"}
                </p>
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">AI Career Agent</p>
                <div className="flex items-center gap-1 pt-1">
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-input rounded-xl px-4 py-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Message AI Career Agent..."
              className="flex-1 bg-transparent border-none outline-none resize-none text-sm py-2 max-h-[120px] min-h-[24px] text-foreground placeholder:text-muted-foreground"
              rows={1}
            />
            <button
              onClick={send}
              disabled={isLoading || !input.trim()}
              className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-opacity shrink-0 mb-0.5"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
            AI can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </div>
  );
}
