import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import PasswordReset from "../models/PasswordReset.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function signToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");
  return jwt.sign({}, secret, { subject: userId, expiresIn: "7d" });
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function sendResetEmail({ to, resetUrl }) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  if (!host || !user || !pass || !from) {
    return { sent: false, reason: "SMTP not configured", resetUrl };
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  await transporter.sendMail({
    from,
    to,
    subject: "Reset your Student Assistant password",
    text: `Open this link to reset your password:\n\n${resetUrl}\n\nIf you didn’t request this, ignore this email.`,
  });
  return { sent: true };
}

router.post("/signup", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not configured" });
  }
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, name: name || "" });
    const token = signToken(user._id.toString());
    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not configured" });
  }
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = signToken(user._id.toString());
    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select({ email: 1, name: 1 });
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json({ user: { id: user._id, email: user.email, name: user.name } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

router.post("/forgot", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not configured" });
  }
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "Email required" });
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    // Always respond ok (avoid email enumeration)
    if (!user) return res.json({ ok: true });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes
    await PasswordReset.create({ userId: user._id, tokenHash, expiresAt });

    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(
      user.email
    )}`;
    const mail = await sendResetEmail({ to: user.email, resetUrl });
    // Dev convenience: if SMTP not configured, return link
    res.json({ ok: true, ...(mail.sent ? {} : { resetUrl }) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to start reset" });
  }
});

router.post("/reset", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database not configured" });
  }
  try {
    const { token, email, password } = req.body || {};
    if (!token || !email || !password) {
      return res.status(400).json({ error: "token, email, password required" });
    }
    if (String(password).length < 8) return res.status(400).json({ error: "Password too short" });
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.status(400).json({ error: "Invalid reset" });

    const tokenHash = sha256Hex(String(token));
    const reset = await PasswordReset.findOne({ userId: user._id, tokenHash });
    if (!reset) return res.status(400).json({ error: "Invalid reset" });
    if (reset.usedAt) return res.status(400).json({ error: "Reset already used" });
    if (reset.expiresAt.getTime() < Date.now()) return res.status(400).json({ error: "Reset expired" });

    user.passwordHash = await bcrypt.hash(String(password), 10);
    await user.save();
    reset.usedAt = new Date();
    await reset.save();

    const jwtToken = signToken(user._id.toString());
    res.json({ token: jwtToken, user: { id: user._id, email: user.email, name: user.name } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;
