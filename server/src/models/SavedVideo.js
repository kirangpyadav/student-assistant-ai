import mongoose from "mongoose";

const savedVideoSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    videoId: { type: String, required: true, trim: true },
    title: { type: String, default: "" },
    channelTitle: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    subject: { type: String, default: "", trim: true },
    language: { type: String, default: "en", trim: true },
  },
  { timestamps: true }
);

savedVideoSchema.index({ userId: 1, videoId: 1 }, { unique: true });
savedVideoSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.SavedVideo || mongoose.model("SavedVideo", savedVideoSchema);

