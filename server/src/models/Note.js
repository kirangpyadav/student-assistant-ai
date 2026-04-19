import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    topic: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    bookmarked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

noteSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.models.Note || mongoose.model("Note", noteSchema);

