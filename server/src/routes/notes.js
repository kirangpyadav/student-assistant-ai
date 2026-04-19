import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { completeAI } from "../lib/ai.js";
import Note from "../models/Note.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .limit(100);
    res.json({ notes });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load notes" });
  }
});

router.patch("/:id/bookmark", async (req, res) => {
  try {
    const { bookmarked } = req.body || {};
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { bookmarked: Boolean(bookmarked) } },
      { new: true }
    );
    if (!note) return res.status(404).json({ error: "Not found" });
    res.json({ note });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update bookmark" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const r = await Note.deleteOne({ _id: req.params.id, userId: req.userId });
    if (!r.deletedCount) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

router.post("/generate", async (req, res) => {
  try {
    const { topic, save = true } = req.body;
    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "topic required" });
    }
    const text = await completeAI({
      system:
        "You write concise study notes for students: short headings, bullet points, key definitions, and one quick recap. Plain text or light markdown only.",
      user: `Topic: ${topic}\n\nProduce structured short notes suitable for revision.`,
    });
    let note = null;
    if (save) {
      note = await Note.create({
        userId: req.userId,
        topic: topic.trim(),
        content: text,
      });
    }
    res.json({ notes: text, note });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: e.message || "Notes generation failed",
    });
  }
});

export default router;
