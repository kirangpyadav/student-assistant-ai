import { useState, useRef, useEffect } from "react";
import api from "../api/client";

export default function Chat() {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [listening, setListening] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I’m your study assistant. Ask anything — concepts, homework hints, or exam tips.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  async function refreshSessions() {
    const { data } = await api.get("/api/chat/sessions");
    setSessions(data.sessions || []);
    return data.sessions || [];
  }

  async function loadSession(sessionId) {
    const { data } = await api.get(`/api/chat/sessions/${sessionId}`);
    setActiveSessionId(data.session._id);
    setMessages(
      data.session.messages?.length
        ? data.session.messages.map((m) => ({ role: m.role, content: m.content }))
        : [
            {
              role: "assistant",
              content:
                "Hi! I’m your study assistant. Ask anything — concepts, homework hints, or exam tips.",
            },
          ]
    );
  }

  async function newChat() {
    setError("");
    const { data } = await api.post("/api/chat/sessions", { title: "" });
    await refreshSessions();
    await loadSession(data.session._id);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await refreshSessions();
        if (cancelled) return;
        if (list[0]?._id) {
          await loadSession(list[0]._id);
        } else {
          // no sessions yet; keep assistant greeting until first send (will auto-create)
          setActiveSessionId(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.error || e.message || "Failed to load history");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/api/suggest", { params: { q: input.trim() } });
        setSuggestions(data.suggestions || []);
      } catch {
        // ignore
      }
    }, 250);
    return () => clearTimeout(t);
  }, [input]);

  function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input not supported in this browser.");
      return;
    }
    setError("");
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (event) => {
      const text = Array.from(event.results).map((r) => r[0]?.transcript || "").join("");
      setInput(text);
    };
    rec.start();
  }

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextUser = { role: "user", content: text };
    setMessages((m) => [...m, nextUser]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/api/chat/send", {
        message: text,
        sessionId: activeSessionId,
      });
      if (data.sessionId && data.sessionId !== activeSessionId) {
        setActiveSessionId(data.sessionId);
        await refreshSessions();
      } else {
        await refreshSessions();
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Request failed");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Chat</h1>
        <p className="text-sm text-slate-400">Ask doubts and get step-by-step help.</p>
      </div>

      <div className="flex flex-1 flex-col rounded-2xl border border-white/10 bg-slate-900/40">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3">
          <button
            type="button"
            onClick={newChat}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/15"
          >
            New chat
          </button>
          <select
            value={activeSessionId || ""}
            onChange={(e) => e.target.value && loadSession(e.target.value)}
            className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-200 outline-none"
          >
            <option value="" disabled>
              Select a previous chat…
            </option>
            {sessions.map((s) => (
              <option key={s._id} value={s._id}>
                {s.title ? s.title : "Chat"} · {new Date(s.updatedAt).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "border border-white/10 bg-white/[0.06] text-slate-100"
                }`}
              >
                <span className="block text-xs font-medium uppercase tracking-wide opacity-70">
                  {msg.role === "user" ? "You" : "Assistant"}
                </span>
                <div className="mt-1 whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-slate-400">
                Thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question…"
            className="flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30"
          />
          <button
            type="button"
            onClick={startVoice}
            className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
          >
            {listening ? "Listening…" : "Voice"}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Send
          </button>
        </form>
        {suggestions.length > 0 && (
          <div className="border-t border-white/10 px-3 py-2">
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200 hover:bg-white/15"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
