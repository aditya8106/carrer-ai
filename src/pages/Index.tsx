import { useState } from "react";
import { MessageSquare, FileText, Briefcase, ShieldAlert, Sparkles, Menu, Plus, X, Trash2 } from "lucide-react";
import ChatSection from "@/components/ChatSection";
import ResumeAnalysis from "@/components/ResumeAnalysis";
import JobSuggestions from "@/components/JobSuggestions";
import ScamDetection from "@/components/ScamDetection";
import { useChatHistory } from "@/hooks/use-chat-history";

const navItems = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "resume", label: "Resume Analysis", icon: FileText },
  { id: "jobs", label: "Job Suggestions", icon: Briefcase },
  { id: "scam", label: "Scam Detector", icon: ShieldAlert },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    conversations,
    activeId,
    setActiveId,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    getMessages,
    setMessages,
  } = useChatHistory();

  const handleNewChat = () => {
    createConversation();
    setActiveTab("chat");
    setSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    setActiveTab("chat");
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-sidebar flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-accent-foreground text-sm">AI Career Agent</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto md:hidden text-sidebar-foreground hover:text-sidebar-accent-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New chat button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Nav items */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Chat history */}
        {conversations.length > 0 && (
          <div className="flex-1 overflow-y-auto px-3 mt-4 border-t border-sidebar-border pt-3">
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 px-3 mb-2 font-medium">
              Recent chats
            </p>
            <div className="space-y-0.5">
              {conversations.map((convo) => (
                <div
                  key={convo.id}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                    activeTab === "chat" && activeId === convo.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  }`}
                  onClick={() => handleSelectConversation(convo.id)}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-50" />
                  <span className="truncate flex-1">{convo.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(convo.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-sidebar-foreground/50 hover:text-destructive transition-opacity shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sidebar footer */}
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/50">Powered by AI</p>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <div className="flex items-center gap-3 p-3 border-b border-border md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium">
            {navItems.find((n) => n.id === activeTab)?.label}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" && (
            <ChatSection
              conversationId={activeId}
              getMessages={getMessages}
              saveMessages={setMessages}
              onFirstMessage={updateConversationTitle}
              onCreateConversation={createConversation}
            />
          )}
          {activeTab === "resume" && <ResumeAnalysis />}
          {activeTab === "jobs" && <JobSuggestions />}
          {activeTab === "scam" && <ScamDetection />}
        </div>
      </main>
    </div>
  );
};

export default Index;
