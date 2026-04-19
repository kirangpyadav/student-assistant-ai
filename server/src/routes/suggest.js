import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { completeAI } from "../lib/ai.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ suggestions: [] });
    if (q.length > 80) return res.status(400).json({ error: "Query too long" });

    const raw = await completeAI({
      system:
        "Return JSON only. You generate short suggested student questions based on a partial query. No markdown.",
      user: `Given the partial student query: "${q}"\nReturn JSON: {"suggestions":["..."]} with 6 suggestions max. Keep each suggestion under 60 chars.`,
      json: true,
    });
    const parsed = JSON.parse(raw);
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((s) => typeof s === "string").slice(0, 6)
      : [];
    res.json({ suggestions });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
});

export default router;

