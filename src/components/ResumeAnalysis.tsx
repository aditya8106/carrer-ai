import { useState } from "react";
import { FileText, Loader2, CheckCircle, AlertTriangle, Briefcase, Star, Lightbulb, Send } from "lucide-react";
import { apiPost } from "@/lib/api";

interface ResumeAnalysis {
  experience_level: string;
  skills: string[];
  best_job_roles: string[];
  missing_skills: string[];
  improvement_suggestions: string[];
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  analysis?: ResumeAnalysis | null;
};

export default function ResumeAnalysis() {
  const [resumeText, setResumeText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!resumeText.trim() || isLoading) return;

    const userMessage = resumeText.trim();

    setIsLoading(true);
    setError("");
    setAnalysis(null);

    // show user message
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage }
    ]);

    setResumeText("");

    try {
      const data = await apiPost<{ resumeText: string }, { analysis: ResumeAnalysis; error?: string }>(
        "/api/resume-analyze",
        { resumeText: userMessage }
      );
      if (data?.error) throw new Error(data.error);

      setAnalysis(data.analysis);

      // AI reply
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Here is the analysis of your resume:",
          analysis: data.analysis
        }
      ]);

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full">

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {messages.length === 0 && !isLoading && !error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md px-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Resume Analysis</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Paste your resume below and get AI-powered insights on your skills, experience level, and career opportunities.
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
              <p className="text-muted-foreground text-sm">Analyzing your resume...</p>
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

                {/* AI Analysis Cards */}
                {msg.analysis && (
                  <div className="mt-6 space-y-1">

                    {/* Experience Level */}
                    <div className="flex gap-4 py-5 border-b border-border/50">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Star className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Experience Level</p>
                        <p className="text-sm text-foreground/90 font-medium">{msg.analysis.experience_level}</p>
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="flex gap-4 py-5 border-b border-border/50">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Skills Found</p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.analysis.skills?.map((s, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Best Job Roles */}
                    <div className="flex gap-4 py-5 border-b border-border/50">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Briefcase className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Best Job Roles</p>
                        <div className="space-y-1.5">
                          {msg.analysis.best_job_roles?.map((r, i) => (
                            <div key={i} className="text-sm text-foreground/90 flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-primary shrink-0" /> {r}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Missing Skills */}
                    <div className="flex gap-4 py-5 border-b border-border/50">
                      <div className="w-7 h-7 rounded-full bg-warning/15 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Missing Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.analysis.missing_skills?.map((s, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-md bg-warning/10 text-warning text-xs font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Suggestions */}
                    <div className="flex gap-4 py-5">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Lightbulb className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Improvement Tips</p>
                        <div className="space-y-2">
                          {msg.analysis.improvement_suggestions?.map((s, i) => (
                            <p key={i} className="text-sm text-foreground/80 leading-relaxed">{s}</p>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                )}
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
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  analyze();
                }
              }}
              placeholder="Paste your resume text here..."
              className="flex-1 bg-transparent border-none outline-none resize-none text-sm py-2 max-h-[160px] min-h-[24px] text-foreground placeholder:text-muted-foreground"
              rows={1}
            />
            <button
              onClick={analyze}
              disabled={isLoading || resumeText.trim().length < 20}
              className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-opacity shrink-0 mb-0.5"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
            Paste your full resume for the best analysis results.
          </p>
        </div>
      </div>
    </div>
  );
}