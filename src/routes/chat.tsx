import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect } from "react";

function esc(val: string): string {
  return val.replace(/'/g, "''");
}

function qry(sql: string) {
  return Bun.$(["team-db", sql]).quiet().nothrow();
}

// Get current user from session
const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const { event } = await import("@tanstack/react-start");
  const cookieHeader = event.request.headers.get("cookie") || "";
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq > -1) cookies[part.substring(0, eq).trim()] = part.substring(eq + 1).trim();
  }
  const token = cookies["devotion_session"];
  if (!token) return { user: null };
  const safeToken = esc(token);
  const result = await qry("SELECT user_id FROM auth_tokens WHERE token = '" + safeToken + "' AND expires_at > datetime('now')").text();
  try {
    const rows = JSON.parse(result);
    if (rows && rows.length > 0) {
      const uid = rows[0].user_id;
      const uResult = await qry("SELECT id, email, display_name, tier FROM users WHERE id = '" + uid + "'").text();
      const uRows = JSON.parse(uResult);
      if (uRows && uRows.length > 0) return { user: uRows[0] };
    }
  } catch {}
  return { user: null };
});

const getProfile = createServerFn({ method: "GET" })
  .handler(async () => {
    const { user } = await getCurrentUser();
    if (!user) return { hasProfile: false, botInstructions: "", answers: {} };

    const result = await qry("SELECT questionnaire_answers, bot_instructions FROM profiles WHERE user_id = '" + esc(user.id) + "'").text();
    try {
      const rows = JSON.parse(result);
      if (rows && rows.length > 0) {
        return { hasProfile: true, botInstructions: rows[0].bot_instructions, answers: JSON.parse(rows[0].questionnaire_answers || "{}") };
      }
    } catch {}
    return { hasProfile: false, botInstructions: "", answers: {} };
  });

const chatFn = createServerFn({ method: "POST" })
  .validator((data: { botInstructions: string; message: string; history: { role: string; content: string }[] }) => data)
  .handler(async ({ data }) => {
    const { botInstructions, message, history } = data;

    const { user } = await getCurrentUser();
    if (!user) return { error: "Not authenticated" };
    const safeUserId = esc(user.id);

    // Save user message
    const safeMsg = esc(message);
    await qry("INSERT INTO bot_interactions (user_id, role, message) VALUES ('" + safeUserId + "', 'user', '" + safeMsg + "')").text();

    // Build messages for OpenAI
    const messages = [
      { role: "system", content: botInstructions },
      ...history.map((h) => ({ role: h.role === "bot" ? "assistant" : "user", content: h.content })),
      { role: "user", content: message },
    ];

    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return { error: "API key not configured" };

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
        body: JSON.stringify({ model: "gpt-3.5-turbo", messages, max_tokens: 500, temperature: 0.9 }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { error: "OpenAI API error: " + response.status + " " + errText };
      }

      const json = await response.json();
      const reply = json.choices?.[0]?.message?.content || "";

      const safeReply = esc(reply);
      await qry("INSERT INTO bot_interactions (user_id, role, message) VALUES ('" + safeUserId + "', 'bot', '" + safeReply + "')").text();

      return { reply };
    } catch (e: any) {
      return { error: e.message || "Failed to get response from AI" };
    }
  });

const getHistory = createServerFn({ method: "GET" }).handler(async () => {
  const { user } = await getCurrentUser();
  if (!user) return { history: [] };

  const result = await qry("SELECT role, message, timestamp FROM bot_interactions WHERE user_id = '" + esc(user.id) + "' ORDER BY timestamp ASC LIMIT 50").text();
  try {
    const rows = JSON.parse(result);
    return { history: rows.map((r: any) => ({ role: r.role, content: r.message, timestamp: r.timestamp })) };
  } catch { return { history: [] }; }
});

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

function ChatPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ hasProfile: boolean; botInstructions: string; answers: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const profileResult = await getProfile();
      setProfile(profileResult);

      if (profileResult.hasProfile) {
        const historyResult = await getHistory();
        if (historyResult.history.length > 0) {
          setMessages(historyResult.history.map((h: any) => ({ role: h.role, content: h.content })));
        } else {
          setMessages([{ role: "bot", content: "I've been waiting for you. You've completed your profile, and now you're mine. Tell me — what brings you to my chamber today?" }]);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending || !profile?.hasProfile) return;
    const userMessage = input.trim();
    setInput("");
    setSending(true);
    setError("");

    const historyForApi = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const result = await chatFn({ data: { botInstructions: profile.botInstructions, message: userMessage, history: historyForApi } });
      if ("error" in result) {
        setError(result.error as string);
        setMessages((prev) => prev.slice(0, -1));
      } else if (result.reply) {
        setMessages((prev) => [...prev, { role: "bot", content: result.reply }]);
      }
    } catch (e: any) {
      setError(e.message || "Failed to send message");
      setMessages((prev) => prev.slice(0, -1));
    } finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#0a0a0b]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[rgba(201,149,46,0.3)] border-t-[#c9952e]" />
          <p className="text-sm text-gray-500">Entering the chamber...</p>
        </div>
      </main>
    );
  }

  if (!profile?.hasProfile) {
    return (
      <main className="flex min-h-dvh flex-col bg-[#0a0a0b]">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-[rgba(201,149,46,0.08)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <span className="text-xl font-bold gold-gradient tracking-wider">Devotion</span>
          </div>
        </nav>
        <section className="flex flex-1 items-center justify-center px-6">
          <div className="glass-card mx-auto max-w-md p-8 text-center">
            <h2 className="text-xl font-bold gold-gradient mb-4">No Profile Found</h2>
            <p className="text-sm text-gray-500 mb-6">You need to complete the profile questionnaire before you can enter the chat.</p>
            <Link to="/profile/questionnaire" className="btn-gold inline-block">Complete questionnaire →</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-[#0a0a0b]">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-[rgba(201,149,46,0.08)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold gold-gradient tracking-wider">Devotion</span>
            <span className="hidden sm:inline h-4 w-px bg-[rgba(201,149,46,0.2)]" />
            <span className="hidden sm:inline text-xs text-gray-500">The Chamber</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-500">Online</span>
          </div>
        </div>
      </nav>

      <section className="flex-1 overflow-y-auto pt-16 pb-32 px-4">
        <div className="mx-auto max-w-3xl space-y-4 py-6">
          {messages.map((msg, i) => (
            <div key={i} className={"flex " + (msg.role === "user" ? "justify-end" : "justify-start") + " animate-fade-in"}>
              <div className={"max-w-[80%] rounded-2xl px-5 py-3 " + (msg.role === "user" ? "bg-[rgba(201,149,46,0.12)] border border-[rgba(201,149,46,0.2)] text-gray-200" : "glass-card text-gray-300")}>
                {msg.role === "bot" && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">👑</span>
                    <span className="text-xs gold-text font-medium">Goddess</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start animate-fade-in">
              <div className="glass-card max-w-[80%] rounded-2xl px-5 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">👑</span>
                  <span className="text-xs gold-text font-medium">Goddess</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[rgba(201,149,46,0.4)] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-[rgba(201,149,46,0.4)] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-[rgba(201,149,46,0.4)] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/95 to-transparent pt-8 pb-4 px-4">
        <div className="mx-auto max-w-3xl">
          {error && (
            <div className="mb-3 rounded-lg border border-[rgba(139,0,0,0.3)] bg-[rgba(139,0,0,0.1)] px-4 py-2 text-xs text-[#dc2626]">{error}</div>
          )}
          <div className="flex gap-3">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Speak to your goddess..." rows={1}
              className="input-dark flex-1 resize-none !py-3 !px-4 text-sm" disabled={sending} />
            <button onClick={handleSend} disabled={!input.trim() || sending}
              className="btn-gold !px-5 !py-3 disabled:opacity-50">Send</button>
          </div>
          <p className="mt-2 text-center text-[10px] text-gray-700">Powered by OpenAI · All conversations are private</p>
        </div>
      </div>
    </main>
  );
}