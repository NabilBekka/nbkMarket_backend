import { pool } from "../config/db";
export interface Merchant { id: string; email: string; password_hash: string | null; first_name: string; last_name: string; company_name: string; category_id: number | null; wilaya_code: number | null; sells_buys: boolean; offers_services: boolean; has_physical_shop: boolean; offers_delivery: boolean; reset_code: string | null; reset_expires: string | null; refresh_token: string | null; lang: string; created_at: string; updated_at: string; }
export async function findByEmail(email: string): Promise<Merchant | null> { const { rows } = await pool.query("SELECT * FROM merchants WHERE email = $1", [email]); return rows[0] || null; }
export async function findByCompanyName(name: string): Promise<Merchant | null> { const { rows } = await pool.query("SELECT * FROM merchants WHERE company_name = $1", [name]); return rows[0] || null; }
export async function findById(id: string): Promise<Merchant | null> { const { rows } = await pool.query("SELECT * FROM merchants WHERE id = $1", [id]); return rows[0] || null; }
export async function createMerchant(data: { email: string; password_hash: string | null; first_name: string; last_name: string; company_name: string; category_id?: number | null; wilaya_code?: number | null; sells_buys?: boolean; offers_services?: boolean; has_physical_shop?: boolean; offers_delivery?: boolean; lang?: string }): Promise<Merchant> {
  const { rows } = await pool.query(
    `INSERT INTO merchants (email, password_hash, first_name, last_name, company_name, category_id, wilaya_code, sells_buys, offers_services, has_physical_shop, offers_delivery, lang)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [data.email, data.password_hash, data.first_name, data.last_name, data.company_name,
     data.category_id || null, data.wilaya_code || null,
     data.sells_buys ?? false, data.offers_services ?? false,
     data.has_physical_shop ?? false, data.offers_delivery ?? false,
     data.lang || "en"]
  );
  return rows[0];
}
export async function updateMerchant(id: string, fields: Partial<Merchant>): Promise<Merchant> { const keys = Object.keys(fields).filter(k => k !== "id"); const values = keys.map(k => (fields as any)[k]); const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", "); const { rows } = await pool.query(`UPDATE merchants SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`, [id, ...values]); return rows[0]; }
export async function deleteMerchant(id: string): Promise<void> { await pool.query("DELETE FROM merchants WHERE id = $1", [id]); }
