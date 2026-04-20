import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import * as MerchantModel from "../models/merchant";
import * as PendingModel from "../models/pendingMerchant";
import * as WilayaModel from "../models/wilaya";
import * as JWT from "../services/jwt";
import * as Email from "../services/email";
import { AuthRequest } from "../middlewares/auth";

const SALT_ROUNDS = 12;
const CODE_EXPIRY_MINUTES = 10;
function codeExpiresAt(): Date { return new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000); }
function sanitize(m: MerchantModel.Merchant) { return { id: m.id, email: m.email, first_name: m.first_name, last_name: m.last_name, company_name: m.company_name, category_id: m.category_id, wilaya_code: m.wilaya_code, sells_buys: m.sells_buys, offers_services: m.offers_services, has_physical_shop: m.has_physical_shop, offers_delivery: m.offers_delivery, role: "merchant", lang: m.lang, created_at: m.created_at }; }

export async function register(req: Request, res: Response) { try {
  const { email, password, first_name, last_name, company_name, category_id, wilaya_code, sells_buys, offers_services, has_physical_shop, offers_delivery, delivery_wilayas, lang } = req.body;
  if (await MerchantModel.findByEmail(email)) return res.status(409).json({ error: "Email already in use" });
  if (await MerchantModel.findByCompanyName(company_name)) return res.status(409).json({ error: "Company name already taken" });
  const pc = await PendingModel.findByCompanyName(company_name);
  if (pc && pc.email !== email) return res.status(409).json({ error: "Company name already taken" });
  await PendingModel.deleteByEmail(email);
  const codeSent = Email.generateCode();
  const dwJson = Array.isArray(delivery_wilayas) ? JSON.stringify(delivery_wilayas) : "[]";
  await PendingModel.create({ email, password_hash: await bcrypt.hash(password, SALT_ROUNDS), first_name, last_name, company_name, category_id: category_id || null, wilaya_code: wilaya_code || null, sells_buys: sells_buys ?? false, offers_services: offers_services ?? false, has_physical_shop: has_physical_shop ?? false, offers_delivery: offers_delivery ?? false, delivery_wilayas: dwJson, lang: lang || "en", verification_code: codeSent, verification_expires: codeExpiresAt() });
  await Email.sendVerificationEmail(email, codeSent, lang || "en");
  return res.status(200).json({ message: "Verification code sent", email });
} catch (err) { console.error("[MERCHANT] Register:", err); return res.status(500).json({ error: "Internal server error" }); } }

export async function verifyEmail(req: Request, res: Response) { try {
  const { email, code } = req.body;
  const p = await PendingModel.findByEmail(email);
  if (!p) return res.status(404).json({ error: "No pending registration found" });
  if (p.verification_code !== code || new Date(p.verification_expires) < new Date()) return res.status(400).json({ error: "Invalid or expired code" });
  const m = await MerchantModel.createMerchant({ email: p.email, password_hash: p.password_hash, first_name: p.first_name, last_name: p.last_name, company_name: p.company_name, category_id: p.category_id, wilaya_code: p.wilaya_code, sells_buys: p.sells_buys, offers_services: p.offers_services, has_physical_shop: p.has_physical_shop, offers_delivery: p.offers_delivery, lang: p.lang });

  // Save delivery wilayas
  if (p.offers_delivery && p.delivery_wilayas) {
    try {
      const codes: number[] = JSON.parse(p.delivery_wilayas);
      if (codes.length > 0) await WilayaModel.setDeliveryWilayas(m.id, codes);
    } catch (e) { console.error("[MERCHANT] Failed to parse delivery_wilayas:", e); }
  }

  await PendingModel.deleteByEmail(email);
  await Email.sendWelcomeEmail(m.email, m.first_name, m.lang);
  const at = JWT.generateAccessToken({ userId: m.id, role: "merchant" }); const rt = JWT.generateRefreshToken({ userId: m.id, role: "merchant" });
  await MerchantModel.updateMerchant(m.id, { refresh_token: rt } as any);
  res.cookie("refreshToken", rt, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7*24*60*60*1000, path: "/" });
  return res.status(201).json({ accessToken: at, user: sanitize(m) });
} catch (err: any) { console.error("[MERCHANT] Verify:", err); if (err?.code === "23505") return res.status(409).json({ error: "Email or company name already in use" }); return res.status(500).json({ error: "Internal server error" }); } }

export async function resendCode(req: Request, res: Response) { try {
  const { email } = req.body;
  const p = await PendingModel.findByEmail(email);
  if (!p) return res.status(404).json({ error: "No pending registration" });
  const code = Email.generateCode();
  await PendingModel.deleteByEmail(email);
  await PendingModel.create({ ...p, verification_code: code, verification_expires: codeExpiresAt() });
  await Email.sendVerificationEmail(email, code, p.lang);
  return res.status(200).json({ message: "New code sent" });
} catch (err) { console.error("[MERCHANT] Resend:", err); return res.status(500).json({ error: "Internal server error" }); } }

export async function checkCompanyName(req: Request, res: Response) { try {
  const { name } = req.params;
  if (await MerchantModel.findByCompanyName(name)) return res.json({ available: false });
  if (await PendingModel.findByCompanyName(name)) return res.json({ available: false });
  return res.json({ available: true });
} catch (err) { return res.status(500).json({ error: "Internal server error" }); } }

export async function login(req: Request, res: Response) { try {
  const { email, password } = req.body;
  const m = await MerchantModel.findByEmail(email);
  if (!m || !m.password_hash) return res.status(401).json({ error: "Invalid credentials" });
  if (!(await bcrypt.compare(password, m.password_hash))) return res.status(401).json({ error: "Invalid credentials" });
  const at = JWT.generateAccessToken({ userId: m.id, role: "merchant" }); const rt = JWT.generateRefreshToken({ userId: m.id, role: "merchant" });
  await MerchantModel.updateMerchant(m.id, { refresh_token: rt } as any);
  res.cookie("refreshToken", rt, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7*24*60*60*1000, path: "/" });
  return res.json({ accessToken: at, user: sanitize(m) });
} catch (err) { console.error("[MERCHANT] Login:", err); return res.status(500).json({ error: "Internal server error" }); } }

export async function forgotPassword(req: Request, res: Response) { try {
  const { email, lang } = req.body;
  const m = await MerchantModel.findByEmail(email);
  if (!m) return res.json({ message: "If this email exists, a reset code has been sent." });
  const code = Email.generateCode();
  await MerchantModel.updateMerchant(m.id, { reset_code: code, reset_expires: codeExpiresAt().toISOString() } as any);
  await Email.sendResetEmail(email, code, lang || m.lang);
  return res.json({ message: "If this email exists, a reset code has been sent." });
} catch (err) { console.error("[MERCHANT] Forgot:", err); return res.status(500).json({ error: "Internal server error" }); } }

export async function resetPassword(req: Request, res: Response) { try {
  const { email, code, password } = req.body;
  const m = await MerchantModel.findByEmail(email);
  if (!m) return res.status(400).json({ error: "Invalid request" });
  if (m.reset_code !== code || !m.reset_expires || new Date(m.reset_expires) < new Date()) return res.status(400).json({ error: "Invalid or expired code" });
  await MerchantModel.updateMerchant(m.id, { password_hash: await bcrypt.hash(password, SALT_ROUNDS), reset_code: null, reset_expires: null } as any);
  return res.json({ message: "Password reset successful" });
} catch (err) { console.error("[MERCHANT] Reset:", err); return res.status(500).json({ error: "Internal server error" }); } }

export async function refreshToken(req: Request, res: Response) { try {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: "No refresh token" });
  const payload = JWT.verifyRefreshToken(token);
  const m = await MerchantModel.findById(payload.userId);
  if (!m || m.refresh_token !== token) return res.status(401).json({ error: "Invalid refresh token" });
  const at = JWT.generateAccessToken({ userId: m.id, role: "merchant" }); const rt = JWT.generateRefreshToken({ userId: m.id, role: "merchant" });
  await MerchantModel.updateMerchant(m.id, { refresh_token: rt } as any);
  res.cookie("refreshToken", rt, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7*24*60*60*1000, path: "/" });
  return res.json({ accessToken: at });
} catch (err) { return res.status(401).json({ error: "Invalid refresh token" }); } }

export async function logout(req: AuthRequest, res: Response) { try {
  if (req.userId) await MerchantModel.updateMerchant(req.userId, { refresh_token: null } as any);
  res.clearCookie("refreshToken", { path: "/" });
  return res.json({ message: "Logged out" });
} catch (err) { return res.status(500).json({ error: "Internal server error" }); } }

export async function getMe(req: AuthRequest, res: Response) { try {
  if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
  const m = await MerchantModel.findById(req.userId);
  if (!m) return res.status(404).json({ error: "Not found" });
  return res.json({ user: sanitize(m) });
} catch (err) { return res.status(500).json({ error: "Internal server error" }); } }

export async function updateProfile(req: AuthRequest, res: Response) { try {
  if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
  const { password, updates } = req.body;
  const m = await MerchantModel.findById(req.userId);
  if (!m || !m.password_hash) return res.status(404).json({ error: "Not found" });
  if (!(await bcrypt.compare(password, m.password_hash))) return res.status(401).json({ error: "Incorrect password" });

  const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

  const f: any = {};
  if (updates.first_name) {
    if (!nameRegex.test(updates.first_name)) return res.status(400).json({ error: "First name: letters only" });
    if (updates.first_name !== m.first_name) f.first_name = updates.first_name;
  }
  if (updates.last_name) {
    if (!nameRegex.test(updates.last_name)) return res.status(400).json({ error: "Last name: letters only" });
    if (updates.last_name !== m.last_name) f.last_name = updates.last_name;
  }
  if (updates.email) {
    if (!emailRegex.test(updates.email)) return res.status(400).json({ error: "Invalid email format" });
    if (updates.email !== m.email) { if (await MerchantModel.findByEmail(updates.email)) return res.status(409).json({ error: "Email already in use" }); f.email = updates.email; }
  }
  if (updates.company_name && updates.company_name !== m.company_name) { if (await MerchantModel.findByCompanyName(updates.company_name)) return res.status(409).json({ error: "Company name already taken" }); f.company_name = updates.company_name; }
  if (updates.new_password) {
    if (!passwordRegex.test(updates.new_password)) return res.status(400).json({ error: "Password does not meet requirements" });
    f.password_hash = await bcrypt.hash(updates.new_password, SALT_ROUNDS);
  }
  if (!Object.keys(f).length) return res.json({ message: "No changes", user: sanitize(m) });
  const u = await MerchantModel.updateMerchant(m.id, f);
  return res.json({ message: "Profile updated", user: sanitize(u) });
} catch (err: any) { console.error("[MERCHANT] Update:", err); if (err?.code === "23505") return res.status(409).json({ error: "Email or company name already in use" }); return res.status(500).json({ error: "Internal server error" }); } }

export async function deleteAccount(req: AuthRequest, res: Response) { try {
  if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
  const { password } = req.body;
  const m = await MerchantModel.findById(req.userId);
  if (!m || !m.password_hash) return res.status(404).json({ error: "Not found" });
  if (!(await bcrypt.compare(password, m.password_hash))) return res.status(401).json({ error: "Incorrect password" });
  const { email, first_name, lang } = m;
  await MerchantModel.deleteMerchant(m.id);
  res.clearCookie("refreshToken", { path: "/" });
  await Email.sendAccountDeletedEmail(email, first_name, lang);
  return res.json({ message: "Account deleted" });
} catch (err) { console.error("[MERCHANT] Delete:", err); return res.status(500).json({ error: "Internal server error" }); } }

export async function updateLang(req: AuthRequest, res: Response) { try {
  if (!req.userId) return res.status(401).json({ error: "Not authenticated" });
  const { lang } = req.body;
  if (lang !== "en" && lang !== "fr") return res.status(400).json({ error: "Invalid language" });
  const u = await MerchantModel.updateMerchant(req.userId, { lang } as any);
  return res.json({ message: "Language updated", lang: u.lang });
} catch (err) { return res.status(500).json({ error: "Internal server error" }); } }
