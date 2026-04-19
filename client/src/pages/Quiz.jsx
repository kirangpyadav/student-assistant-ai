import { useEffect, useMemo, useState } from "react";
import api from "../api/client";

export default function Quiz() {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [timerSec, setTimerSec] = useState(0);
  const [timeLeftSec, setTimeLeftSec] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalTimeSec = useMemo(() => {
    // simple rule: 25 seconds per question
    return questions?.length ? questions.length * 25 : 0;
  }, [questions]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/quiz/attempts");
        setAttempts(data.attempts || []);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (!questions || submitted) return;
    setTimerSec(0);
    setTimeLeftSec(totalTimeSec || null);
    const t = setInterval(() => {
      setTimerSec((s) => s + 1);
      setTimeLeftSec((s) => (s == null ? null : Math.max(0, s - 1)));
    }, 1000);
    return () => clearInterval(t);
  }, [questions, submitted, totalTimeSec]);

  useEffect(() => {
    if (timeLeftSec === 0 && questions && !submitted) {
      void finalizeAttempt(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftSec]);

  async function generate(e) {
    e.preventDefault();
    if (!topic.trim()) return;
    setError("");
    setLoading(true);
    setSubmitted(false);
    setAnswers({});
    try {
      const { data } = await api.post("/api/quiz/generate", {
        topic: topic.trim(),
        count,
      });
      setQuestions(data.questions);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to generate quiz");
      setQuestions(null);
    } finally {
      setLoading(false);
    }
  }

  function select(qIndex, optionIndex) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qIndex]: optionIndex }));
  }

  function score() {
    if (!questions) return { correct: 0, total: 0 };
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correct += 1;
    });
    return { correct, total: questions.length };
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  async function finalizeAttempt(autoSubmit = false) {
    if (!questions || submitted) return;
    setSubmitted(true);
    try {
      const payloadAnswers = questions.map((q, i) => ({
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        selectedIndex: answers[i] ?? null,
      }));
      await api.post("/api/quiz/attempts", {
        topic: topic.trim(),
        durationSec: autoSubmit ? totalTimeSec : timerSec,
        answers: payloadAnswers,
      });
      const { data } = await api.get("/api/quiz/attempts");
      setAttempts(data.attempts || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to save attempt");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Quiz generator</h1>
        <p className="text-sm text-slate-400">Describe a topic — we’ll build MCQs for you.</p>
      </div>

      <form onSubmit={generate} className="flex flex-wrap items-end gap-4">
        <label className="min-w-[200px] flex-1">
          <span className="text-sm text-slate-400">Topic</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Photosynthesis"
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50"
          />
        </label>
        <label>
          <span className="text-sm text-slate-400">Questions</span>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-1 block rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50"
          >
            {[3, 5, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {questions && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm text-slate-300">
              <span className="font-medium text-white">Timer</span>{" "}
              {timeLeftSec == null ? "—" : formatTime(timeLeftSec)}
              <span className="ml-3 text-slate-500">(elapsed {formatTime(timerSec)})</span>
            </div>
            {!submitted ? (
              <button
                type="button"
                onClick={() => finalizeAttempt(false)}
                className="rounded-xl bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/15"
              >
                Submit
              </button>
            ) : (
              <div className="text-sm text-emerald-300">
                Score: {score().correct} / {score().total}
              </div>
            )}
          </div>
          {questions.map((q, qi) => (
            <div
              key={qi}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <p className="font-medium text-white">
                {qi + 1}. {q.question}
              </p>
              <div className="mt-4 space-y-2">
                {q.options.map((opt, oi) => {
                  const picked = answers[qi] === oi;
                  let cls =
                    "w-full rounded-lg border px-4 py-3 text-left text-sm transition ";
                  if (!submitted) {
                    cls += picked
                      ? "border-indigo-500 bg-indigo-500/15 text-white"
                      : "border-white/10 bg-slate-900/50 text-slate-200 hover:border-white/20";
                  } else {
                    const isCorrect = oi === q.correctIndex;
                    const isWrongPick = picked && !isCorrect;
                    if (isCorrect) cls += "border-emerald-500/60 bg-emerald-500/15 text-emerald-100";
                    else if (isWrongPick)
                      cls += "border-red-500/60 bg-red-500/15 text-red-100";
                    else cls += "border-white/10 bg-slate-900/40 text-slate-500";
                  }
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => select(qi, oi)}
                      className={cls}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => finalizeAttempt(false)}
              disabled={submitted}
              className="rounded-xl bg-white/10 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
            >
              {submitted ? "Graded" : "Check answers"}
            </button>
            {submitted && (
              <p className="text-sm text-emerald-300">
                Score: {score().correct} / {score().total}
              </p>
            )}
          </div>
        </div>
      )}

      {attempts.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold text-white">Recent attempts</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {attempts.slice(0, 5).map((a) => (
              <li key={a._id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-400">
                  {a.topic} · {new Date(a.createdAt).toLocaleString()}
                </span>
                <span className="font-medium text-white">
                  {a.correct}/{a.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
