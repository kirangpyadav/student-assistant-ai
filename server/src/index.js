import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import quizRoutes from "./routes/quiz.js";
import notesRoutes from "./routes/notes.js";
import videosRoutes from "./routes/videos.js";
import analyticsRoutes from "./routes/analytics.js";
import suggestRoutes from "./routes/suggest.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
console.log(`AI_PROVIDER=${process.env.AI_PROVIDER || "openai"}`);

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  const mongo = mongoose.connection.readyState;
  res.json({
    ok: true,
    mongo:
      mongo === 1 ? "connected" : process.env.MONGODB_URI?.trim() ? "not_ready" : "missing_uri",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/videos", videosRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/suggest", suggestRoutes);

async function main() {
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    console.warn(
      "MONGODB_URI not set — auth disabled. Put .env in the server/ folder (or set MONGODB_URI)."
    );
  } else {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  }
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
