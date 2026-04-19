import mongoose from "mongoose";

const quizAnswerSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true },
    selectedIndex: { type: Number, default: null },
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    topic: { type: String, required: true, trim: true },
    total: { type: Number, required: true },
    correct: { type: Number, required: true },
    durationSec: { type: Number, default: null },
    answers: { type: [quizAnswerSchema], default: [] },
  },
  { timestamps: true }
);

quizAttemptSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.QuizAttempt || mongoose.model("QuizAttempt", quizAttemptSchema);

