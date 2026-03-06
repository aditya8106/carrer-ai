import { useState, useCallback } from "react";

export type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
};

type Message = { role: "user" | "assistant"; content: string };

const CONVERSATIONS_KEY = "chat-conversations";
const MESSAGES_KEY_PREFIX = "chat-messages-";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversations(convos: Conversation[]) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convos));
}

function loadMessages(id: string): Message[] {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY_PREFIX + id);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(id: string, messages: Message[]) {
  localStorage.setItem(MESSAGES_KEY_PREFIX + id, JSON.stringify(messages));
}

// Migrate old single chat-history to new format
function migrateOldHistory(): string | null {
  try {
    const old = localStorage.getItem("chat-history");
    if (!old) return null;
    const messages: Message[] = JSON.parse(old);
    if (!messages.length) {
      localStorage.removeItem("chat-history");
      return null;
    }
    const id = generateId();
    const firstUserMsg = messages.find((m) => m.role === "user");
    const title = firstUserMsg ? firstUserMsg.content.slice(0, 40) : "Previous chat";
    const convo: Conversation = { id, title, updatedAt: Date.now() };
    saveConversations([convo]);
    saveMessages(id, messages);
    localStorage.removeItem("chat-history");
    return id;
  } catch {
    return null;
  }
}

export function useChatHistory() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const existing = loadConversations();
    if (existing.length) return existing;
    const migratedId = migrateOldHistory();
    if (migratedId) return loadConversations();
    return [];
  });

  const [activeId, setActiveId] = useState<string | null>(() => {
    const convos = loadConversations();
    return convos.length > 0 ? convos[0].id : null;
  });

  const createConversation = useCallback(() => {
    const id = generateId();
    const convo: Conversation = { id, title: "New chat", updatedAt: Date.now() };
    setConversations((prev) => {
      const next = [convo, ...prev];
      saveConversations(next);
      return next;
    });
    saveMessages(id, []);
    setActiveId(id);
    return id;
  }, []);

  const updateConversationTitle = useCallback((id: string, title: string) => {
    setConversations((prev) => {
      const next = prev.map((c) =>
        c.id === id ? { ...c, title: title.slice(0, 40), updatedAt: Date.now() } : c
      );
      saveConversations(next);
      return next;
    });
  }, []);

  const deleteConversation = useCallback((id: string) => {
    localStorage.removeItem(MESSAGES_KEY_PREFIX + id);
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveConversations(next);
      return next;
    });
    setActiveId((current) => {
      if (current === id) {
        const remaining = loadConversations();
        return remaining.length > 0 ? remaining[0].id : null;
      }
      return current;
    });
  }, []);

  const getMessages = useCallback((id: string): Message[] => {
    return loadMessages(id);
  }, []);

  const setMessages = useCallback((id: string, messages: Message[]) => {
    saveMessages(id, messages);
  }, []);

  return {
    conversations,
    activeId,
    setActiveId,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    getMessages,
    setMessages,
  };
}
