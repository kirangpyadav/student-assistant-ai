import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { completeAI } from "../lib/ai.js";
import QuizAttempt from "../models/QuizAttempt.js";

const router = Router();
router.use(requireAuth);

router.post("/generate", async (req, res) => {
  try {
    const { topic, count = 5 } = req.body;
    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "topic required" });
    }
    const n = Math.min(Math.max(Number(count) || 5, 1), 15);
    const raw = await completeAI({
      system:
        "You generate educational multiple-choice quizzes as strict JSON only. No markdown.",
      user: `Create exactly ${n} MCQs about: "${topic}". Return JSON with shape: {"questions":[{"question":"...","options":["A","B","C","D"],"correctIndex":0}]} where correctIndex is 0-3.`,
      json: true,
    });
    const parsed = JSON.parse(raw);
    if (!parsed.questions?.length) {
      throw new Error("Invalid quiz structure");
    }
    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: e.message || "Quiz generation failed",
    });
  }
});

router.get("/attempts", async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ attempts });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load attempts" });
  }
});

router.post("/attempts", async (req, res) => {
  try {
    const { topic, durationSec, answers } = req.body || {};
    if (!topic || typeof topic !== "string") return res.status(400).json({ error: "topic required" });
    if (!Array.isArray(answers) || !answers.length) return res.status(400).json({ error: "answers required" });

    let correct = 0;
    for (const a of answers) {
      if (typeof a.correctIndex === "number" && a.selectedIndex === a.correctIndex) correct += 1;
    }
    const total = answers.length;

    const attempt = await QuizAttempt.create({
      userId: req.userId,
      topic: topic.trim(),
      total,
      correct,
      durationSec: typeof durationSec === "number" ? durationSec : null,
      answers,
    });
    res.status(201).json({ attempt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save attempt" });
  }
});

export default router;
