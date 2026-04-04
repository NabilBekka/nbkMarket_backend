import { Request, Response } from "express";
import bcrypt from "bcrypt";
import * as UserModel from "../models/user";
import * as PendingModel from "../models/pending";
import * as JWT from "../services/jwt";
import * as Email from "../services/email";
import { AuthRequest } from "../middlewares/auth";

const SALT_ROUNDS = 12;
const CODE_EXPIRY_MINUTES = 10;

function codeExpiresAt(): Date {
  return new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
}

function sanitizeUser(user: UserModel.User) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    birth_date: user.birth_date,
    role: user.role,
    lang: user.lang,
    created_at: user.created_at,
  };
}

// POST /api/auth/register
export async function register(req: Request, res: Response) {
  try {
    const { email, password, first_name, last_name, username, birth_date, lang } = req.body;

    // Check email in existing users
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "Email already in use" });
    }

    // Check username in existing users
    const existingUsername = await UserModel.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ error: "Username already taken" });
    }

    // Check username in pending registrations
    const pendingUsername = await PendingModel.findByUsername(username);
    if (pendingUsername && pendingUsername.email !== email) {
      return res.status(409).json({ error: "Username already taken" });
    }

    // Delete any existing pending for this email
    await PendingModel.deleteByEmail(email);

    // Hash password and create pending registration
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const code = Email.generateCode();

    await PendingModel.create({
      email,
      password_hash,
      first_name,
      last_name,
      username,
      birth_date: birth_date || null,
      lang: lang || "en",
      verification_code: code,
      verification_expires: codeExpiresAt(),
    });

    // Send verification email
    await Email.sendVerificationEmail(email, code, lang || "en");

    return res.status(200).json({
      message: "Verification code sent to your email.",
      email,
    });
  } catch (err: unknown) {
    console.error("[AUTH] Register error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/auth/verify-email
export async function verifyEmail(req: Request, res: Response) {
  try {
    const { email, code } = req.body;

    const pending = await PendingModel.findByEmail(email);
    if (!pending) {
      return res.status(404).json({ error: "No pending registration found" });
    }

    if (
      pending.verification_code !== code ||
      new Date(pending.verification_expires) < new Date()
    ) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    // Create the actual user account
    const user = await UserModel.createUser({
      email: pending.email,
      password_hash: pending.password_hash,
      first_name: pending.first_name,
      last_name: pending.last_name,
      username: pending.username,
      birth_date: pending.birth_date,
      role: "client",
      lang: pending.lang,
    });

    // Delete pending registration
    await PendingModel.deleteByEmail(email);

    // Generate tokens
    const accessToken = JWT.generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = JWT.generateRefreshToken({ userId: user.id, role: user.role });

    await UserModel.updateUser(user.id, { refresh_token: refreshToken } as Partial<UserModel.User>);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.status(201).json({
      message: "Account created and verified",
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (err: unknown) {
    console.error("[AUTH] Verify error:", err);
    if (err && typeof err === "object" && "code" in err && (err as Record<string, unknown>).code === "23505") {
      return res.status(409).json({ error: "Email or username already in use" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/auth/resend-code
export async function resendCode(req: Request, res: Response) {
  try {
    const { email } = req.body;

    const pending = await PendingModel.findByEmail(email);
    if (!pending) {
      return res.status(404).json({ error: "No pending registration found" });
    }

    const code = Email.generateCode();
    await PendingModel.deleteByEmail(email);
    await PendingModel.create({
      ...pending,
      verification_code: code,
      verification_expires: codeExpiresAt(),
    });

    await Email.sendVerificationEmail(email, code, pending.lang);

    return res.status(200).json({ message: "New verification code sent." });
  } catch (err) {
    console.error("[AUTH] Resend error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/auth/check-username/:username
export async function checkUsername(req: Request, res: Response) {
  try {
    const { username } = req.params;

    const existingUser = await UserModel.findByUsername(username);
    if (existingUser) {
      return res.status(200).json({ available: false });
    }

    const pendingUser = await PendingModel.findByUsername(username);
    if (pendingUser) {
      return res.status(200).json({ available: false });
    }

    return res.status(200).json({ available: true });
  } catch (err) {
    console.error("[AUTH] Check username error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findByEmail(email);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const accessToken = JWT.generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = JWT.generateRefreshToken({ userId: user.id, role: user.role });

    await UserModel.updateUser(user.id, { refresh_token: refreshToken } as Partial<UserModel.User>);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.status(200).json({
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("[AUTH] Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/auth/forgot-password
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email, lang } = req.body;

    const user = await UserModel.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return res.status(200).json({ message: "If this email exists, a reset code has been sent." });
    }

    const code = Email.generateCode();
    await UserModel.updateUser(user.id, {
      reset_code: code,
      reset_expires: codeExpiresAt().toISOString(),
    } as Partial<UserModel.User>);

    await Email.sendResetEmail(email, code, lang || user.lang);

    return res.status(200).json({ message: "If this email exists, a reset code has been sent." });
  } catch (err) {
    console.error("[AUTH] Forgot password error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/auth/reset-password
export async function resetPassword(req: Request, res: Response) {
  try {
    const { email, code, password } = req.body;

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "Invalid request" });
    }

    if (
      user.reset_code !== code ||
      !user.reset_expires ||
      new Date(user.reset_expires) < new Date()
    ) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    await UserModel.updateUser(user.id, {
      password_hash,
      reset_code: null,
      reset_expires: null,
    } as Partial<UserModel.User>);

    return res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("[AUTH] Reset password error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/auth/refresh-token
export async function refreshToken(req: Request, res: Response) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: "No refresh token" });
    }

    const payload = JWT.verifyRefreshToken(token);
    const user = await UserModel.findById(payload.userId);

    if (!user || user.refresh_token !== token) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const accessToken = JWT.generateAccessToken({ userId: user.id, role: user.role });
    const newRefreshToken = JWT.generateRefreshToken({ userId: user.id, role: user.role });

    await UserModel.updateUser(user.id, { refresh_token: newRefreshToken } as Partial<UserModel.User>);

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.status(200).json({ accessToken });
  } catch (err) {
    console.error("[AUTH] Refresh error:", err);
    return res.status(401).json({ error: "Invalid refresh token" });
  }
}

// POST /api/auth/logout
export async function logout(req: AuthRequest, res: Response) {
  try {
    if (req.userId) {
      await UserModel.updateUser(req.userId, { refresh_token: null } as Partial<UserModel.User>);
    }
    res.clearCookie("refreshToken", { path: "/" });
    return res.status(200).json({ message: "Logged out" });
  } catch (err) {
    console.error("[AUTH] Logout error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/auth/me
export async function getMe(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("[AUTH] GetMe error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
