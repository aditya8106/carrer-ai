import { useState } from "react";
import { ShieldAlert, Loader2, AlertTriangle, CheckCircle, XCircle, Send } from "lucide-react";
import { apiPost } from "@/lib/api";

interface ScamResult {
  risk_score: number;
  scam_likelihood: string;
  red_flags: string[];
  explanation: string;
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  result?: ScamResult | null;
};

export default function ScamDetection() {
  const [jobDescription, setJobDescription] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [result, setResult] = useState<ScamResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const detect = async () => {
    if (!jobDescription.trim() || isLoading) return;

    const userMessage = jobDescription.trim();

    setIsLoading(true);
    setError("");
    setResult(null);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage }
    ]);

    setJobDescription("");

    try {
      const data = await apiPost<{ jobDescription: string }, { result: ScamResult; error?: string }>(
        "/api/scam-detect",
        { jobDescription: userMessage }
      );
      if (data?.error) throw new Error(data.error);

      setResult(data.result);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Here is the scam analysis for this job posting:",
          result: data.result
        }
      ]);

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Detection failed");
    }

    setIsLoading(false);
  };

  const getLikelihoodConfig = (likelihood: string) => {
    switch (likelihood?.toLowerCase()) {
      case "high":
        return { icon: XCircle, color: "text-destructive", bg: "bg-destructive/15", label: "High Risk" };
      case "medium":
        return { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/15", label: "Medium Risk" };
      default:
        return { icon: CheckCircle, color: "text-success", bg: "bg-success/15", label: "Low Risk" };
    }
  };

  return (
    <div className="flex flex-col h-full">

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {messages.length === 0 && !isLoading && !error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md px-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Scam Detector</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Paste a job posting below and I'll check it for red flags, scam patterns, and suspicious language.
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <p className="text-muted-foreground text-sm">Scanning for red flags...</p>
              <div className="flex items-center justify-center gap-1 pt-1">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap
                ${msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                  }`}
              >
                {msg.content}

                {msg.result && (() => {
                  const config = getLikelihoodConfig(msg.result.scam_likelihood);
                  const Icon = config.icon;

                  return (
                    <div className="mt-6 space-y-1">

                      {/* Score */}
                      <div className="flex gap-4 py-5 border-b border-border/50">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${config.bg}`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Risk Assessment</p>
                          <div className="flex items-baseline gap-3">
                            <span className={`text-3xl font-bold ${config.color}`}>{msg.result.risk_score}</span>
                            <span className="text-sm text-muted-foreground">/100</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${config.bg} ${config.color}`}>
                              {config.label}
                            </span>
                          </div>

                          <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${msg.result.risk_score >= 70
                                ? "bg-destructive"
                                : msg.result.risk_score >= 40
                                  ? "bg-warning"
                                  : "bg-success"
                                }`}
                              style={{ width: `${msg.result.risk_score}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Explanation */}
                      <div className="flex gap-4 py-5 border-b border-border/50">
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                          <ShieldAlert className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Analysis</p>
                          <p className="text-sm text-foreground/80 leading-relaxed">
                            {msg.result.explanation}
                          </p>
                        </div>
                      </div>

                      {/* Red Flags */}
                      {msg.result.red_flags?.length > 0 && (
                        <div className="flex gap-4 py-5">
                          <div className="w-7 h-7 rounded-full bg-warning/15 flex items-center justify-center shrink-0 mt-0.5">
                            <AlertTriangle className="w-4 h-4 text-warning" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Red Flags Found</p>
                            <div className="space-y-2">
                              {msg.result.red_flags.map((flag, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                                  <span className="text-warning mt-0.5 shrink-0">⚠</span>
                                  <span className="leading-relaxed">{flag}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-input rounded-xl px-4 py-2">
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  detect();
                }
              }}
              placeholder="Paste a job posting to check for scams..."
              className="flex-1 bg-transparent border-none outline-none resize-none text-sm py-2 max-h-[160px] min-h-[24px] text-foreground placeholder:text-muted-foreground"
              rows={1}
            />
            <button
              onClick={detect}
              disabled={isLoading || jobDescription.trim().length < 10}
              className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-opacity shrink-0 mb-0.5"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
            Paste the full job description for the most accurate analysis.
          </p>
        </div>
      </div>

    </div>
  );
}