import { Router } from "express";
import { google } from "googleapis";
import { requireAuth } from "../middleware/auth.js";
import SavedVideo from "../models/SavedVideo.js";

const router = Router();
router.use(requireAuth);

router.get("/saved", async (req, res) => {
  try {
    const { subject, language } = req.query;
    const q = { userId: req.userId };
    if (subject) q.subject = String(subject);
    if (language) q.language = String(language);
    const videos = await SavedVideo.find(q).sort({ createdAt: -1 }).limit(200);
    res.json({ videos });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load saved videos" });
  }
});

router.post("/saved", async (req, res) => {
  try {
    const { videoId, title = "", channelTitle = "", thumbnail = "", subject = "", language = "en" } = req.body || {};
    if (!videoId) return res.status(400).json({ error: "videoId required" });
    const doc = await SavedVideo.findOneAndUpdate(
      { userId: req.userId, videoId: String(videoId) },
      {
        $set: {
          title: String(title || ""),
          channelTitle: String(channelTitle || ""),
          thumbnail: String(thumbnail || ""),
          subject: String(subject || ""),
          language: String(language || "en"),
        },
      },
      { upsert: true, new: true }
    );
    res.status(201).json({ video: doc });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save video" });
  }
});

router.delete("/saved/:videoId", async (req, res) => {
  try {
    const r = await SavedVideo.deleteOne({ userId: req.userId, videoId: req.params.videoId });
    if (!r.deletedCount) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to remove video" });
  }
});

// "Recommended for you" = recently saved + recent search topic hint (simple MVP)
router.get("/recommended", async (req, res) => {
  try {
    const videos = await SavedVideo.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(12);
    res.json({ videos });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load recommendations" });
  }
});

router.get("/search", async (req, res) => {
  try {
    const q = req.query.q;
    const language = req.query.language;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Query parameter q required" });
    }
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) {
      return res.status(503).json({
        error: "YOUTUBE_API_KEY not configured",
      });
    }
    const youtube = google.youtube({ version: "v3", auth: key });
    const resp = await youtube.search.list({
      part: ["snippet"],
      maxResults: 12,
      q,
      type: ["video"],
      safeSearch: "strict",
      relevanceLanguage: typeof language === "string" && language ? language : "en",
    });
    const items =
      resp.data.items?.map((item) => ({
        id: item.id?.videoId,
        title: item.snippet?.title,
        channelTitle: item.snippet?.channelTitle,
        thumbnail: item.snippet?.thumbnails?.medium?.url,
        publishedAt: item.snippet?.publishedAt,
      })) ?? [];
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: e.message || "YouTube search failed",
    });
  }
});

export default router;
