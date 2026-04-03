import { Request, Response } from "express";
import bcrypt from "bcrypt";
import * as UserModel from "../models/user";
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
    is_verified: user.is_verified,
    lang: user.lang,
    created_at: user.created_at,
  };
}

// POST /api/auth/register
export async function register(req: Request, res: Response) {
  try {
    const { email, password, first_name, last_name, username, birth_date, lang } = req.body;

    const existingEmail = await UserModel.findByEmail(email);
    if (existingEmail && existingEmail.is_verified) {
      return res.status(409).json({ error: "Email already in use" });
    }

    if (existingEmail && !existingEmail.is_verified) {
      await UserModel.updateUser(existingEmail.id, {
        password_hash: await bcrypt.hash(password, SALT_ROUNDS),
        first_name,
        last_name,
        username,
        birth_date,
        verification_code: Email.generateCode(),
        verification_expires: codeExpiresAt().toISOString(),
        lang: lang || "en",
      } as Partial<UserModel.User>);

      const updated = await UserModel.findByEmail(email);
      await Email.sendVerificationEmail(email, updated!.verification_code!, lang || "en");

      return res.status(200).json({
        message: "Verification code resent",
        email,
      });
    }

    if (username) {
      const existingUsername = await UserModel.findByUsername(username);
      if (existingUsername) {
        return res.status(409).json({ error: "Username already taken" });
      }
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const code = Email.generateCode();

    const user = await UserModel.createUser({
      email,
      password_hash,
      first_name,
      last_name,
      username,
      birth_date: birth_date || null,
      role: "client",
      verification_code: code,
      verification_expires: codeExpiresAt(),
      lang: lang || "en",
    });

    await Email.sendVerificationEmail(email, code, lang || "en");

    return res.status(201).json({
      message: "Account created. Check your email for the verification code.",
      email: user.email,
    });
  } catch (err: unknown) {
    console.error("[AUTH] Register error:", err);
    if (err && typeof err === "object" && "code" in err && (err as Record<string, unknown>).code === "23505") {
      return res.status(409).json({ error: "Email or username already in use" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/auth/verify-email
export async function verifyEmail(req: Request, res: Response) {
  try {
    const { email, code } = req.body;

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    if (
      user.verification_code !== code ||
      !user.verification_expires ||
      new Date(user.verification_expires) < new Date()
    ) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    const accessToken = JWT.generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = JWT.generateRefreshToken({ userId: user.id, role: user.role });

    await UserModel.updateUser(user.id, {
      is_verified: true,
      verification_code: null,
      verification_expires: null,
      refresh_token: refreshToken,
    } as Partial<UserModel.User>);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.status(200).json({
      message: "Email verified",
      accessToken,
      user: sanitizeUser({ ...user, is_verified: true }),
    });
  } catch (err) {
    console.error("[AUTH] Verify error:", err);
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

    if (!user.is_verified) {
      const code = Email.generateCode();
      await UserModel.updateUser(user.id, {
        verification_code: code,
        verification_expires: codeExpiresAt().toISOString(),
      } as Partial<UserModel.User>);
      await Email.sendVerificationEmail(email, code, user.lang);

      return res.status(403).json({
        error: "Email not verified",
        message: "A new verification code has been sent to your email.",
        email,
        needsVerification: true,
      });
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
