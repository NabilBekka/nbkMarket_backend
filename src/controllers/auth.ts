import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import * as UserModel from "../models/user";
import * as PendingModel from "../models/pending";
import * as JWT from "../services/jwt";
import * as Email from "../services/email";
import { AuthRequest } from "../middlewares/auth";
import { config } from "../config/env";

const SALT_ROUNDS = 12;
const CODE_EXPIRY_MINUTES = 10;
const googleClient = new OAuth2Client(config.googleClientId);

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

    // Send welcome email
    await Email.sendWelcomeEmail(user.email, user.first_name, user.lang);

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

// POST /api/auth/google
export async function googleAuth(req: Request, res: Response) {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Google credential required" });
    }

    let googleId: string, email: string, given_name: string, family_name: string;

    // Try verifying as ID token first, then as access token
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: config.googleClientId,
      });
      const payload = ticket.getPayload()!;
      googleId = payload.sub;
      email = payload.email!;
      given_name = payload.given_name || "";
      family_name = payload.family_name || "";
    } catch {
      try {
        const response = await fetch(
          `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${credential}`
        );
        if (!response.ok) throw new Error("Invalid token");
        const userInfo = await response.json();
        googleId = userInfo.sub;
        email = userInfo.email;
        given_name = userInfo.given_name || "";
        family_name = userInfo.family_name || "";
      } catch {
        return res.status(401).json({ error: "Invalid Google token" });
      }
    }

    // Check if user already exists
    const existingUser =
      (await UserModel.findByGoogleId(googleId)) ||
      (await UserModel.findByEmail(email));

    if (existingUser) {
      // Link Google account if not already linked
      if (!existingUser.google_id) {
        await UserModel.updateUser(existingUser.id, {
          google_id: googleId,
        } as Partial<UserModel.User>);
      }

      const accessToken = JWT.generateAccessToken({
        userId: existingUser.id,
        role: existingUser.role,
      });
      const refreshToken = JWT.generateRefreshToken({
        userId: existingUser.id,
        role: existingUser.role,
      });

      await UserModel.updateUser(existingUser.id, {
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
        accessToken,
        user: sanitizeUser(existingUser),
        isExistingUser: true,
      });
    }

    // User doesn't exist — send Google data back for registration completion
    return res.status(200).json({
      message: "Please complete registration",
      googleData: {
        googleId,
        email,
        firstName: given_name,
        lastName: family_name,
      },
      isExistingUser: false,
    });
  } catch (err) {
    console.error("[AUTH] Google auth error:", err);
    return res.status(401).json({ error: "Invalid Google token" });
  }
}

// POST /api/auth/google/register
export async function googleRegister(req: Request, res: Response) {
  try {
    const { googleId, email, firstName, lastName, username, password, birthDate } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ error: "Missing Google data" });
    }

    // Check email
    const existingEmail = await UserModel.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: "Email already in use" });
    }

    // Check username
    const existingUsername = await UserModel.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await UserModel.createUser({
      email,
      password_hash,
      first_name: firstName,
      last_name: lastName,
      username,
      birth_date: birthDate || null,
      role: "client",
      google_id: googleId,
      lang: "en",
    });

    const accessToken = JWT.generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = JWT.generateRefreshToken({ userId: user.id, role: user.role });

    await UserModel.updateUser(user.id, {
      refresh_token: refreshToken,
    } as Partial<UserModel.User>);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    // Send welcome email
    await Email.sendWelcomeEmail(user.email, user.first_name, user.lang);

    return res.status(201).json({
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (err: unknown) {
    console.error("[AUTH] Google register error:", err);
    if (err && typeof err === "object" && "code" in err && (err as Record<string, unknown>).code === "23505") {
      return res.status(409).json({ error: "Email or username already in use" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

// PUT /api/auth/profile
export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { password, updates } = req.body;
    // updates = { first_name?, last_name?, username?, email?, birth_date?, new_password? }

    const user = await UserModel.findById(req.userId);
    if (!user || !user.password_hash) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    const fieldsToUpdate: Partial<UserModel.User> = {};

    if (updates.first_name && updates.first_name !== user.first_name) {
      fieldsToUpdate.first_name = updates.first_name;
    }
    if (updates.last_name && updates.last_name !== user.last_name) {
      fieldsToUpdate.last_name = updates.last_name;
    }
    if (updates.birth_date && updates.birth_date !== user.birth_date) {
      fieldsToUpdate.birth_date = updates.birth_date;
    }
    if (updates.email && updates.email !== user.email) {
      const existing = await UserModel.findByEmail(updates.email);
      if (existing) {
        return res.status(409).json({ error: "Email already in use" });
      }
      fieldsToUpdate.email = updates.email;
    }
    if (updates.username && updates.username !== user.username) {
      const existing = await UserModel.findByUsername(updates.username);
      if (existing) {
        return res.status(409).json({ error: "Username already taken" });
      }
      fieldsToUpdate.username = updates.username;
    }
    if (updates.new_password) {
      fieldsToUpdate.password_hash = await bcrypt.hash(updates.new_password, SALT_ROUNDS);
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(200).json({ message: "No changes", user: sanitizeUser(user) });
    }

    const updated = await UserModel.updateUser(user.id, fieldsToUpdate);
    return res.status(200).json({ message: "Profile updated", user: sanitizeUser(updated) });
  } catch (err: unknown) {
    console.error("[AUTH] Update profile error:", err);
    if (err && typeof err === "object" && "code" in err && (err as Record<string, unknown>).code === "23505") {
      return res.status(409).json({ error: "Email or username already in use" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

// DELETE /api/auth/account
export async function deleteAccount(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { password } = req.body;

    const user = await UserModel.findById(req.userId);
    if (!user || !user.password_hash) {
      return res.status(404).json({ error: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    // Save info before deletion for the email
    const email = user.email;
    const firstName = user.first_name;
    const lang = user.lang;

    await UserModel.deleteUser(user.id);
    res.clearCookie("refreshToken", { path: "/" });

    // Send deletion confirmation email
    await Email.sendAccountDeletedEmail(email, firstName, lang);

    return res.status(200).json({ message: "Account deleted" });
  } catch (err) {
    console.error("[AUTH] Delete account error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// PUT /api/auth/lang
export async function updateLang(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { lang } = req.body;
    if (lang !== "en" && lang !== "fr") {
      return res.status(400).json({ error: "Invalid language" });
    }

    const updated = await UserModel.updateUser(req.userId, { lang } as Partial<UserModel.User>);
    return res.status(200).json({ message: "Language updated", lang: updated.lang });
  } catch (err) {
    console.error("[AUTH] Update lang error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
