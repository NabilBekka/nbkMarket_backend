import { pool } from "../config/db";

export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  first_name: string;
  last_name: string;
  username: string | null;
  birth_date: string | null;
  role: "client" | "merchant";
  google_id: string | null;
  is_verified: boolean;
  verification_code: string | null;
  verification_expires: string | null;
  reset_code: string | null;
  reset_expires: string | null;
  refresh_token: string | null;
  lang: string;
  created_at: string;
  updated_at: string;
}

export async function findByEmail(email: string): Promise<User | null> {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return rows[0] || null;
}

export async function findByUsername(username: string): Promise<User | null> {
  const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
  return rows[0] || null;
}

export async function findById(id: string): Promise<User | null> {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] || null;
}

export async function findByGoogleId(googleId: string): Promise<User | null> {
  const { rows } = await pool.query("SELECT * FROM users WHERE google_id = $1", [googleId]);
  return rows[0] || null;
}

export async function createUser(data: {
  email: string;
  password_hash: string | null;
  first_name: string;
  last_name: string;
  username: string | null;
  birth_date: string | null;
  role: "client" | "merchant";
  google_id?: string | null;
  is_verified?: boolean;
  verification_code?: string | null;
  verification_expires?: Date | null;
  lang?: string;
}): Promise<User> {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, username, birth_date, role, google_id, is_verified, verification_code, verification_expires, lang)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.email,
      data.password_hash,
      data.first_name,
      data.last_name,
      data.username,
      data.birth_date,
      data.role,
      data.google_id || null,
      data.is_verified || false,
      data.verification_code || null,
      data.verification_expires || null,
      data.lang || "en",
    ]
  );
  return rows[0];
}

export async function updateUser(id: string, fields: Partial<User>): Promise<User> {
  const keys = Object.keys(fields).filter((k) => k !== "id");
  const values = keys.map((k) => (fields as Record<string, unknown>)[k]);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");

  const { rows } = await pool.query(
    `UPDATE users SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return rows[0];
}

export async function deleteUnverifiedExpired(): Promise<void> {
  await pool.query(
    "DELETE FROM users WHERE is_verified = false AND verification_expires < NOW() - INTERVAL '1 hour'"
  );
}
