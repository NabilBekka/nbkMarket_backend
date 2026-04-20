import { pool } from "../config/db";

export interface Wilaya {
  code: number;
  name_fr: string;
  name_en: string;
}

export async function findAll(): Promise<Wilaya[]> {
  const { rows } = await pool.query("SELECT * FROM wilayas ORDER BY code");
  return rows;
}

export async function findByCode(code: number): Promise<Wilaya | null> {
  const { rows } = await pool.query("SELECT * FROM wilayas WHERE code = $1", [code]);
  return rows[0] || null;
}

// Delivery wilayas for a merchant
export async function getDeliveryWilayas(merchantId: string): Promise<Wilaya[]> {
  const { rows } = await pool.query(
    `SELECT w.* FROM wilayas w
     JOIN merchant_delivery_wilayas mdw ON mdw.wilaya_code = w.code
     WHERE mdw.merchant_id = $1
     ORDER BY w.code`,
    [merchantId]
  );
  return rows;
}

export async function setDeliveryWilayas(merchantId: string, wilayaCodes: number[]): Promise<void> {
  await pool.query("DELETE FROM merchant_delivery_wilayas WHERE merchant_id = $1", [merchantId]);
  for (const code of wilayaCodes) {
    await pool.query(
      "INSERT INTO merchant_delivery_wilayas (merchant_id, wilaya_code) VALUES ($1, $2)",
      [merchantId, code]
    );
  }
}
