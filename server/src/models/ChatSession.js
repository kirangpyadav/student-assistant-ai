import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    ts: { type: Date, default: Date.now },
    bookmarked: { type: Boolean, default: false },
  },
  { _id: false }
);

const chatSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, trim: true, default: "" },
    messages: { type: [chatMessageSchema], default: [] },
  },
  { timestamps: true }
);

chatSessionSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.models.ChatSession || mongoose.model("ChatSession", chatSessionSchema);

