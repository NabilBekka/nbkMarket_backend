import { pool } from "../config/db";
export interface PendingMerchant { id: string; email: string; password_hash: string; first_name: string; last_name: string; company_name: string; category_id: number | null; wilaya_code: number | null; profile_image: string | null; cover_image: string | null; address: string | null; description: string | null; sells_buys: boolean; offers_services: boolean; has_physical_shop: boolean; offers_delivery: boolean; delivery_wilayas: string; lang: string; verification_code: string; verification_expires: string; created_at: string; }
export async function create(data: { email: string; password_hash: string; first_name: string; last_name: string; company_name: string; category_id?: number | null; wilaya_code?: number | null; profile_image?: string | null; cover_image?: string | null; address?: string | null; description?: string | null; sells_buys?: boolean; offers_services?: boolean; has_physical_shop?: boolean; offers_delivery?: boolean; delivery_wilayas?: string; lang: string; verification_code: string; verification_expires: Date }): Promise<PendingMerchant> {
  const { rows } = await pool.query(
    `INSERT INTO pending_merchant_registrations (email, password_hash, first_name, last_name, company_name, category_id, wilaya_code, profile_image, cover_image, address, description, sells_buys, offers_services, has_physical_shop, offers_delivery, delivery_wilayas, lang, verification_code, verification_expires)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
    [data.email, data.password_hash, data.first_name, data.last_name, data.company_name,
     data.category_id || null, data.wilaya_code || null,
     data.profile_image || null, data.cover_image || null, data.address || null, data.description || null,
     data.sells_buys ?? false, data.offers_services ?? false,
     data.has_physical_shop ?? false, data.offers_delivery ?? false,
     data.delivery_wilayas || "[]",
     data.lang, data.verification_code, data.verification_expires]
  );
  return rows[0];
}
export async function findByEmail(email: string): Promise<PendingMerchant | null> { const { rows } = await pool.query("SELECT * FROM pending_merchant_registrations WHERE email = $1 ORDER BY created_at DESC LIMIT 1", [email]); return rows[0] || null; }
export async function findByCompanyName(name: string): Promise<PendingMerchant | null> { const { rows } = await pool.query("SELECT * FROM pending_merchant_registrations WHERE company_name = $1 AND verification_expires > NOW() LIMIT 1", [name]); return rows[0] || null; }
export async function deleteByEmail(email: string): Promise<void> { await pool.query("DELETE FROM pending_merchant_registrations WHERE email = $1", [email]); }
