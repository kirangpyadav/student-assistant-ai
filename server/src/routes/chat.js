import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { completeAI } from "../lib/ai.js";
import ChatSession from "../models/ChatSession.js";

const router = Router();
router.use(requireAuth);

router.get("/sessions", async (req, res) => {
  try {
    const sessions = await ChatSession.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .limit(50)
      .select({ title: 1, updatedAt: 1, createdAt: 1 });
    res.json({ sessions });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load sessions" });
  }
});

router.get("/sessions/:id", async (req, res) => {
  try {
    const session = await ChatSession.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) return res.status(404).json({ error: "Not found" });
    res.json({ session });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load session" });
  }
});

router.post("/sessions", async (req, res) => {
  try {
    const { title = "" } = req.body || {};
    const session = await ChatSession.create({
      userId: req.userId,
      title: String(title || "").slice(0, 80),
      messages: [],
    });
    res.status(201).json({ session });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create session" });
  }
});

router.patch("/sessions/:id/bookmark", async (req, res) => {
  try {
    const { messageIndex, bookmarked } = req.body || {};
    const idx = Number(messageIndex);
    if (!Number.isInteger(idx) || idx < 0) return res.status(400).json({ error: "messageIndex invalid" });
    const session = await ChatSession.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) return res.status(404).json({ error: "Not found" });
    if (!session.messages[idx]) return res.status(400).json({ error: "messageIndex out of range" });
    session.messages[idx].bookmarked = Boolean(bookmarked);
    await session.save();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to bookmark" });
  }
});

router.post("/send", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message required" });
    }
    let session = null;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, userId: req.userId });
      if (!session) return res.status(404).json({ error: "Session not found" });
    } else {
      const inferredTitle = message.trim().slice(0, 60);
      session = await ChatSession.create({ userId: req.userId, title: inferredTitle, messages: [] });
    }

    const historyText = session.messages
      .slice(-12)
      .map((h) => `${h.role === "assistant" ? "Assistant" : "Student"}: ${h.content}`)
      .join("\n");
    const userPrompt = historyText
      ? `Conversation so far:\n${historyText}\n\nStudent question:\n${message}`
      : message;

    const reply = await completeAI({
      system:
        "You are a helpful tutor for students. Give clear, accurate explanations. If unsure, say so. Keep answers focused and encouraging.",
      user: userPrompt,
    });
    session.messages.push({ role: "user", content: message, ts: new Date() });
    session.messages.push({ role: "assistant", content: reply, ts: new Date() });
    await session.save();

    res.json({ reply, sessionId: session._id });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: e.message || "Chat failed — check AI API keys and AI_PROVIDER in .env",
    });
  }
});

export default router;
