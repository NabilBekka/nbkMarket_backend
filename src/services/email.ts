import { Resend } from "resend";
import { config } from "../config/env";

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationEmail(
  to: string,
  code: string,
  lang: string = "en"
): Promise<void> {
  const subject =
    lang === "fr"
      ? "NBK Market - Vérification de votre email"
      : "NBK Market - Verify your email";

  const html =
    lang === "fr"
      ? `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;">
           <h2 style="color:#0B1A2E;">NBK Market</h2>
           <p>Votre code de vérification :</p>
           <div style="background:#F4F6FA;padding:16px;border-radius:8px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#0B1A2E;">${code}</div>
           <p style="color:#888;font-size:13px;margin-top:16px;">Ce code expire dans 10 minutes.</p>
         </div>`
      : `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;">
           <h2 style="color:#0B1A2E;">NBK Market</h2>
           <p>Your verification code:</p>
           <div style="background:#F4F6FA;padding:16px;border-radius:8px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#0B1A2E;">${code}</div>
           <p style="color:#888;font-size:13px;margin-top:16px;">This code expires in 10 minutes.</p>
         </div>`;

  if (resend) {
    await resend.emails.send({ from: config.emailFrom, to, subject, html });
  } else {
    console.log(`[EMAIL] Verification code for ${to}: ${code}`);
  }
}

export async function sendResetEmail(
  to: string,
  code: string,
  lang: string = "en"
): Promise<void> {
  const subject =
    lang === "fr"
      ? "NBK Market - Réinitialisation de votre mot de passe"
      : "NBK Market - Reset your password";

  const html =
    lang === "fr"
      ? `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;">
           <h2 style="color:#0B1A2E;">NBK Market</h2>
           <p>Votre code de réinitialisation :</p>
           <div style="background:#F4F6FA;padding:16px;border-radius:8px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#0B1A2E;">${code}</div>
           <p style="color:#888;font-size:13px;margin-top:16px;">Ce code expire dans 10 minutes.</p>
         </div>`
      : `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;">
           <h2 style="color:#0B1A2E;">NBK Market</h2>
           <p>Your password reset code:</p>
           <div style="background:#F4F6FA;padding:16px;border-radius:8px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#0B1A2E;">${code}</div>
           <p style="color:#888;font-size:13px;margin-top:16px;">This code expires in 10 minutes.</p>
         </div>`;

  if (resend) {
    await resend.emails.send({ from: config.emailFrom, to, subject, html });
  } else {
    console.log(`[EMAIL] Reset code for ${to}: ${code}`);
  }
}
