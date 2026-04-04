import nodemailer from "nodemailer";
import { config } from "../config/env";

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: false,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"NBK Market" <${config.smtp.user}>`,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL] Sent to ${to}`);
    return true;
  } catch (error) {
    console.error("[EMAIL] Send error:", error);
    return false;
  }
}

export async function sendVerificationEmail(
  to: string,
  code: string,
  lang: string = "en"
): Promise<boolean> {
  const subject =
    lang === "fr"
      ? "NBK Market - Vérification de votre email"
      : "NBK Market - Verify your email";

  const title = lang === "fr" ? "Vérification de votre email" : "Verify your email";
  const intro =
    lang === "fr"
      ? "Votre code de vérification :"
      : "Your verification code:";
  const expiry =
    lang === "fr"
      ? "Ce code expire dans 10 minutes."
      : "This code expires in 10 minutes.";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0B1A2E; margin-bottom: 4px;">NBK Market</h2>
      <p style="color: #888; font-size: 14px;">${title}</p>
      <p style="font-size: 14px; color: #333;">${intro}</p>
      <div style="background: #F4F6FA; padding: 20px; border-radius: 10px; text-align: center; margin: 16px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0B1A2E;">${code}</span>
      </div>
      <p style="color: #888; font-size: 12px;">${expiry}</p>
    </div>
  `;

  return sendEmail(to, subject, html);
}

export async function sendResetEmail(
  to: string,
  code: string,
  lang: string = "en"
): Promise<boolean> {
  const subject =
    lang === "fr"
      ? "NBK Market - Réinitialisation de votre mot de passe"
      : "NBK Market - Reset your password";

  const title =
    lang === "fr"
      ? "Réinitialisation de votre mot de passe"
      : "Reset your password";
  const intro =
    lang === "fr"
      ? "Votre code de réinitialisation :"
      : "Your password reset code:";
  const expiry =
    lang === "fr"
      ? "Ce code expire dans 10 minutes."
      : "This code expires in 10 minutes.";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #0B1A2E; margin-bottom: 4px;">NBK Market</h2>
      <p style="color: #888; font-size: 14px;">${title}</p>
      <p style="font-size: 14px; color: #333;">${intro}</p>
      <div style="background: #F4F6FA; padding: 20px; border-radius: 10px; text-align: center; margin: 16px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0B1A2E;">${code}</span>
      </div>
      <p style="color: #888; font-size: 12px;">${expiry}</p>
    </div>
  `;

  return sendEmail(to, subject, html);
}
