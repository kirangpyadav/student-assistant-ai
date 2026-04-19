import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import api from "../api/client";

const cards = [
  {
    to: "/chat",
    title: "Ask doubts",
    desc: "Chat with an AI tutor about any topic.",
    emoji: "💬",
  },
  {
    to: "/quiz",
    title: "Quiz generator",
    desc: "Auto-build MCQs for quick practice.",
    emoji: "📝",
  },
  {
    to: "/notes",
    title: "Short notes",
    desc: "Turn a topic into revision-friendly notes.",
    emoji: "📚",
  },
  {
    to: "/videos",
    title: "Video picks",
    desc: "Find learning videos from YouTube.",
    emoji: "🎥",
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/api/analytics/summary");
        if (!cancelled) setSummary(data);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.error || e.message || "Failed to load analytics");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Hi{user?.name ? ` ${user.name}` : ""} 👋
        </h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Everything you need to learn in one place — questions, quizzes, notes, and videos.
        </p>
      </div>
      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-slate-400">Total questions asked</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.totalQuestionsAsked}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-slate-400">Quiz performance</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {summary.quiz?.avgPct == null ? "—" : `${summary.quiz.avgPct}%`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Attempts: {summary.quiz?.attempts || 0} · Best: {summary.quiz?.bestPct == null ? "—" : `${summary.quiz.bestPct}%`}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-slate-400">Study streak</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {summary.streakDays} <span className="text-base font-medium text-slate-400">days</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Keep it going 🔥</p>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-indigo-500/40 hover:bg-white/[0.06]"
          >
            <span className="text-3xl">{c.emoji}</span>
            <h2 className="mt-3 text-lg font-semibold text-white group-hover:text-indigo-200">
              {c.title}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
