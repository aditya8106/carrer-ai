import { useState } from "react";
import { Briefcase, Loader2, TrendingUp, ExternalLink, Send, Target } from "lucide-react";
import { apiPost } from "@/lib/api";

interface JobSuggestion {
  title: string;
  company_type: string;
  salary_range: string;
  match_score: number;
  why_good_fit: string;
  skills_to_highlight: string[];
  search_query?: string;
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  jobs?: JobSuggestion[];
};

const getJobLinks = (title: string, query?: string) => {
  const q = encodeURIComponent(query || title);
  return [
    { label: "LinkedIn", url: `https://www.linkedin.com/jobs/search/?keywords=${q}` },
    { label: "Indeed", url: `https://www.indeed.com/jobs?q=${q}` },
    { label: "Glassdoor", url: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${q}` },
  ];
};

export default function JobSuggestions() {
  const [resumeSummary, setResumeSummary] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const getSuggestions = async () => {
    if (!resumeSummary.trim() || isLoading) return;

    const userMessage = resumeSummary.trim();

    setIsLoading(true);
    setError("");

    // show user message
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage }
    ]);

    setResumeSummary("");

    try {
      const data = await apiPost<{ resumeSummary: string }, { suggestions?: JobSuggestion[]; error?: string }>(
        "/api/job-suggestions",
        { resumeSummary: userMessage }
      );
      if (data?.error) throw new Error(data.error);

      const aiJobs = data.suggestions || [];

      // show AI reply
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Here are some job suggestions based on your skills:",
          jobs: aiJobs
        }
      ]);

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to get suggestions");
    }

    setIsLoading(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-primary";
    return "text-warning";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-success/15";
    if (score >= 60) return "bg-primary/15";
    return "bg-warning/15";
  };

  return (
    <div className="flex flex-col h-full">

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {messages.length === 0 && !isLoading && !error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md px-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Job Suggestions</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Share your skills or resume summary below and get AI-powered job recommendations with direct links to apply.
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
              <p className="text-muted-foreground text-sm">Finding matching jobs...</p>
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

                {/* AI Job Cards */}
                {msg.jobs && (
                  <div className="mt-4 space-y-4">
                    {msg.jobs.map((job, j) => (
                      <div key={j} className="p-3 rounded-lg border border-border bg-background">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-semibold">{job.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {job.company_type} · {job.salary_range}
                            </p>
                          </div>

                          <div className={`flex items-center gap-1 font-bold text-sm ${getScoreColor(job.match_score)}`}>
                            <TrendingUp className="w-3.5 h-3.5" />
                            {job.match_score}%
                          </div>
                        </div>

                        <p className="text-xs mt-2">{job.why_good_fit}</p>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {job.skills_to_highlight?.map((s, k) => (
                            <span
                              key={k}
                              className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs"
                            >
                              {s}
                            </span>
                          ))}
                        </div>

                        <div className="flex gap-3 mt-2">
                          {getJobLinks(job.title, job.search_query).map((link) => (
                            <a
                              key={link.label}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {link.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
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
              value={resumeSummary}
              onChange={(e) => setResumeSummary(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  getSuggestions();
                }
              }}
              placeholder="Describe your skills or paste your resume summary..."
              className="flex-1 bg-transparent border-none outline-none resize-none text-sm py-2 max-h-[160px] min-h-[24px] text-foreground placeholder:text-muted-foreground"
              rows={1}
            />

            <button
              onClick={getSuggestions}
              disabled={isLoading || !resumeSummary.trim()}
              className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-opacity shrink-0 mb-0.5"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
            Include your top skills and experience for better recommendations.
          </p>
        </div>
      </div>

    </div>
  );
}