import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import ChatSession from "../models/ChatSession.js";
import QuizAttempt from "../models/QuizAttempt.js";
import Note from "../models/Note.js";

const router = Router();
router.use(requireAuth);

function yyyyMmDd(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function computeStreak(daysSet) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  for (;;) {
    const key = yyyyMmDd(today);
    if (!daysSet.has(key)) break;
    streak += 1;
    today.setDate(today.getDate() - 1);
  }
  return streak;
}

router.get("/summary", async (req, res) => {
  try {
    const userId = req.userId;

    const [sessions, quizAttempts, notes] = await Promise.all([
      ChatSession.find({ userId }).select({ messages: 1, createdAt: 1, updatedAt: 1 }),
      QuizAttempt.find({ userId }).select({ correct: 1, total: 1, createdAt: 1 }),
      Note.find({ userId }).select({ createdAt: 1 }),
    ]);

    let totalQuestionsAsked = 0;
    const activeDays = new Set();

    for (const s of sessions) {
      if (s.createdAt) activeDays.add(yyyyMmDd(s.createdAt));
      if (s.updatedAt) activeDays.add(yyyyMmDd(s.updatedAt));
      for (const m of s.messages || []) {
        if (m.role === "user") totalQuestionsAsked += 1;
        if (m.ts) activeDays.add(yyyyMmDd(m.ts));
      }
    }

    let quizTotal = 0;
    let quizCorrect = 0;
    let bestPct = null;
    for (const a of quizAttempts) {
      activeDays.add(yyyyMmDd(a.createdAt));
      quizTotal += a.total || 0;
      quizCorrect += a.correct || 0;
      const pct = a.total ? Math.round((a.correct / a.total) * 100) : null;
      if (pct != null) bestPct = bestPct == null ? pct : Math.max(bestPct, pct);
    }

    for (const n of notes) {
      activeDays.add(yyyyMmDd(n.createdAt));
    }

    const avgPct = quizTotal ? Math.round((quizCorrect / quizTotal) * 100) : null;
    const streakDays = computeStreak(activeDays);

    res.json({
      totalQuestionsAsked,
      quiz: {
        attempts: quizAttempts.length,
        avgPct,
        bestPct,
      },
      streakDays,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to compute analytics" });
  }
});

export default router;

