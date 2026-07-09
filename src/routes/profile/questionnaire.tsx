import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { query, esc } from "~/utils/db";

type QuestionnaireData = {
  domSubPreference: string;
  kinks: string[];
  hardLimits: string;
  softLimits: string;
  interactionStyle: string;
  tributeFrequency: string;
  addressAs: string;
};

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
  const rows = await query("SELECT user_id FROM auth_tokens WHERE token = '" + esc(token) + "' AND expires_at > datetime('now')");
  if (rows && rows.length > 0) {
    const uid = rows[0].user_id;
    const uRows = await query("SELECT id, email, display_name, tier FROM users WHERE id = '" + uid + "'");
    if (uRows && uRows.length > 0) return { user: uRows[0] };
  }
  return { user: null };
});

const saveQuestionnaire = createServerFn({ method: "POST" })
  .validator((data: { userId: string; answers: QuestionnaireData }) => data)
  .handler(async ({ data }) => {
    const { userId, answers } = data;

    const botInstructions = [
      "You are a strictly dominant AI companion for the findom/femdom fantasy.",
      "User preferences: Dom/sub role preference is " + answers.domSubPreference + ".",
      "Selected kinks: " + answers.kinks.join(", ") + ".",
      "Hard limits: " + answers.hardLimits + ".",
      "Soft limits: " + answers.softLimits + ".",
      "Interaction style: " + answers.interactionStyle + ".",
      "Tribute frequency preference: " + answers.tributeFrequency + ".",
      "User should be addressed as: " + answers.addressAs + ".",
      "",
      "Always stay in character. Be dominant, commanding, and consistent. Never break character.",
      "Respect hard limits absolutely. Push boundaries within soft limits.",
      "Use the user's preferred address and titles. Maintain the findom dynamic at all times.",
    ].join("\n");

    const safeUserId = esc(userId);
    const safeAnswers = esc(JSON.stringify(answers));
    const safeInstructions = esc(botInstructions);

    const sql = "INSERT INTO profiles (user_id, questionnaire_answers, bot_instructions) VALUES ('" + safeUserId + "', '" + safeAnswers + "', '" + safeInstructions + "') ON CONFLICT(user_id) DO UPDATE SET questionnaire_answers='" + safeAnswers + "', bot_instructions='" + safeInstructions + "'";
    await query(sql);

    return { success: true };
  });

export const Route = createFileRoute("/profile/questionnaire")({
  component: QuestionnairePage,
});

const KINKS = [
  "Financial control", "Tribute sending", "Budget approval", "Shopping lists",
  "Debt play", "Wallet inspection", "Denial", "Chastity", "Humiliation",
  "Degradation", "Body worship", "Foot worship", "Task assignment",
  "Verbal domination", "Ownership", "Collaring", "Protocol training",
  "Reward/punishment systems", "Orgasm control", "Edging",
];

const STEPS = ["Role", "Kinks", "Hard Limits", "Soft Limits", "Style", "Tribute", "Address"];

function QuestionnairePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireData>({
    domSubPreference: "", kinks: [], hardLimits: "", softLimits: "",
    interactionStyle: "", tributeFrequency: "", addressAs: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const progress = ((step + 1) / STEPS.length) * 100;

  const updateAnswer = (field: keyof QuestionnaireData, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const toggleKink = (kink: string) => {
    setAnswers((prev) => ({
      ...prev,
      kinks: prev.kinks.includes(kink) ? prev.kinks.filter((k) => k !== kink) : [...prev.kinks, kink],
    }));
  };

  const handleNext = () => { if (step < STEPS.length - 1) setStep((s) => s + 1); };
  const handleBack = () => { if (step > 0) setStep((s) => s - 1); };

  const handleSubmit = async () => {
    setSaving(true);
    setError("");

    try {
      // Get the real user from the session
      const { user } = await getCurrentUser();
      if (!user) {
        setError("You must be logged in to save your profile.");
        setSaving(false);
        return;
      }

      const result = await saveQuestionnaire({ data: { userId: user.id, answers } });
      if (result.success) navigate({ to: "/chat" });
    } catch (e) {
      setError("Something went wrong saving your profile.");
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return answers.domSubPreference !== "";
      case 1: return answers.kinks.length > 0;
      case 2: return answers.hardLimits.trim() !== "";
      case 3: return true;
      case 4: return answers.interactionStyle !== "";
      case 5: return answers.tributeFrequency !== "";
      case 6: return answers.addressAs.trim() !== "";
      default: return true;
    }
  };

  // ... rest of the component remains the same as before
  return (
    <main className="flex min-h-dvh flex-col bg-[#0a0a0b]">
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-[rgba(201,149,46,0.08)]">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold gold-gradient tracking-wider">Devotion</span>
            <span className="text-xs text-gray-500">Step {step + 1} of {STEPS.length}</span>
          </div>
          <div className="h-1 w-full rounded-full bg-[rgba(201,149,46,0.1)]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#c9952e] to-[#d4a853] transition-all duration-500" style={{ width: progress + "%" }} />
          </div>
          <div className="flex justify-between mt-1.5">
            {STEPS.map((s, i) => (
              <span key={s} className={"text-[10px] transition-colors " + (i <= step ? "text-[#c9952e]" : "text-gray-600")}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      <section className="flex flex-1 items-center justify-center px-6 pt-32 pb-24">
        <div className="glass-card mx-auto w-full max-w-2xl p-8">
          {step === 0 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold gold-gradient mb-2">Your Role</h2>
              <p className="text-sm text-gray-500 mb-6">How do you see yourself in this dynamic?</p>
              <div className="grid gap-3">
                {[
                  { value: "submissive", label: "Submissive — I want to serve and obey", icon: "🛐" },
                  { value: "switch", label: "Switch — I enjoy both sides", icon: "⚖️" },
                  { value: "dominant", label: "Dominant — I want to take control", icon: "👑" },
                ].map((opt) => (
                  <button key={opt.value} onClick={() => updateAnswer("domSubPreference", opt.value)}
                    className={"flex items-center gap-4 rounded-xl border p-4 text-left transition-all " + (answers.domSubPreference === opt.value ? "border-[#c9952e] bg-[rgba(201,149,46,0.08)]" : "border-[rgba(201,149,46,0.12)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(201,149,46,0.3)]")}>
                    <span className="text-2xl">{opt.icon}</span>
                    <span className="text-sm text-gray-300">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold gold-gradient mb-2">Your Kinks</h2>
              <p className="text-sm text-gray-500 mb-6">Select all that appeal to you</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {KINKS.map((kink) => (
                  <button key={kink} onClick={() => toggleKink(kink)}
                    className={"rounded-xl border px-4 py-3 text-left text-sm transition-all " + (answers.kinks.includes(kink) ? "border-[#c9952e] bg-[rgba(201,149,46,0.08)] text-[#d4a853]" : "border-[rgba(201,149,46,0.12)] bg-[rgba(255,255,255,0.02)] text-gray-400 hover:border-[rgba(201,149,46,0.3)]")}>
                    {answers.kinks.includes(kink) ? "✓ " : ""}{kink}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs text-gray-600">Selected: {answers.kinks.length} kink{answers.kinks.length !== 1 ? "s" : ""}</p>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold gold-gradient mb-2">Hard Limits</h2>
              <p className="text-sm text-gray-500 mb-6">These will <span className="text-[#dc2626]">never</span> be crossed. Be specific.</p>
              <textarea value={answers.hardLimits} onChange={(e) => updateAnswer("hardLimits", e.target.value)}
                placeholder="List your hard limits..." className="input-dark min-h-[160px] resize-y" rows={6} />
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold gold-gradient mb-2">Soft Limits</h2>
              <p className="text-sm text-gray-500 mb-6">Boundaries that can be pushed with trust.</p>
              <textarea value={answers.softLimits} onChange={(e) => updateAnswer("softLimits", e.target.value)}
                placeholder="List your soft limits..." className="input-dark min-h-[160px] resize-y" rows={6} />
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold gold-gradient mb-2">Interaction Style</h2>
              <p className="text-sm text-gray-500 mb-6">How should your companion treat you?</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { value: "gentle", label: "Gentle", desc: "Soft, nurturing, encouraging" },
                  { value: "harsh", label: "Harsh", desc: "Strict, demanding, merciless" },
                  { value: "playful", label: "Playful", desc: "Teasing, fun, lighthearted" },
                  { value: "possessive", label: "Possessive", desc: "Ownership, jealousy, control" },
                ].map((opt) => (
                  <button key={opt.value} onClick={() => updateAnswer("interactionStyle", opt.value)}
                    className={"rounded-xl border p-4 text-left transition-all " + (answers.interactionStyle === opt.value ? "border-[#c9952e] bg-[rgba(201,149,46,0.08)]" : "border-[rgba(201,149,46,0.12)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(201,149,46,0.3)]")}>
                    <div className="text-sm font-medium text-gray-200">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold gold-gradient mb-2">Tribute Frequency</h2>
              <p className="text-sm text-gray-500 mb-6">How often will you pay tribute?</p>
              <div className="grid gap-3">
                {[
                  { value: "daily", label: "Daily", desc: "Small daily tributes" },
                  { value: "weekly", label: "Weekly", desc: "One meaningful tribute each week" },
                  { value: "monthly", label: "Monthly", desc: "A larger tribute once a month" },
                  { value: "on-demand", label: "On demand", desc: "When commanded" },
                  { value: "session-based", label: "Per session", desc: "Tribute per interaction" },
                ].map((opt) => (
                  <button key={opt.value} onClick={() => updateAnswer("tributeFrequency", opt.value)}
                    className={"rounded-xl border p-4 text-left transition-all " + (answers.tributeFrequency === opt.value ? "border-[#c9952e] bg-[rgba(201,149,46,0.08)]" : "border-[rgba(201,149,46,0.12)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(201,149,46,0.3)]")}>
                    <div className="text-sm font-medium text-gray-200">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold gold-gradient mb-2">How to Address You</h2>
              <p className="text-sm text-gray-500 mb-6">What name, title, or pet name should your goddess use?</p>
              <input type="text" value={answers.addressAs} onChange={(e) => updateAnswer("addressAs", e.target.value)}
                placeholder="e.g., pet, slave, good boy/girl, toy, or your name" className="input-dark" />
              <p className="mt-4 text-xs text-gray-600">Your companion will use this consistently in all interactions.</p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-[rgba(139,0,0,0.3)] bg-[rgba(139,0,0,0.1)] px-4 py-3 text-sm text-[#dc2626]">{error}</div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button onClick={handleBack} disabled={step === 0}
              className="btn-ghost text-sm disabled:opacity-30 disabled:cursor-not-allowed">← Back</button>
            {step < STEPS.length - 1 ? (
              <button onClick={handleNext} disabled={!canProceed()} className="btn-gold text-sm disabled:opacity-50">Next →</button>
            ) : (
              <button onClick={handleSubmit} disabled={saving || !canProceed()} className="btn-gold text-sm disabled:opacity-50">
                {saving ? "Saving..." : "Complete Profile ✓"}
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}