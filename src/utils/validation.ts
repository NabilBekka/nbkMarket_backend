import { z } from "zod";

const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().regex(passwordRegex, "Password does not meet requirements"),
  first_name: z.string().min(2).regex(nameRegex, "Letters only"),
  last_name: z.string().min(2).regex(nameRegex, "Letters only"),
  username: z.string().min(3).max(20),
  birth_date: z.string().optional(),
  lang: z.enum(["en", "fr"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const resendCodeSchema = z.object({
  email: z.string().email(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  lang: z.enum(["en", "fr"]).optional(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  password: z.string().regex(passwordRegex, "Password does not meet requirements"),
});
