import { pool } from "../config/db";

export interface PendingRegistration {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  username: string;
  birth_date: string | null;
  lang: string;
  verification_code: string;
  verification_expires: string;
  created_at: string;
}

export async function create(data: {
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  username: string;
  birth_date: string | null;
  lang: string;
  verification_code: string;
  verification_expires: Date;
}): Promise<PendingRegistration> {
  const { rows } = await pool.query(
    `INSERT INTO pending_registrations (email, password_hash, first_name, last_name, username, birth_date, lang, verification_code, verification_expires)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.email,
      data.password_hash,
      data.first_name,
      data.last_name,
      data.username,
      data.birth_date,
      data.lang,
      data.verification_code,
      data.verification_expires,
    ]
  );
  return rows[0];
}

export async function findByEmail(email: string): Promise<PendingRegistration | null> {
  const { rows } = await pool.query(
    "SELECT * FROM pending_registrations WHERE email = $1 ORDER BY created_at DESC LIMIT 1",
    [email]
  );
  return rows[0] || null;
}

export async function findByUsername(username: string): Promise<PendingRegistration | null> {
  const { rows } = await pool.query(
    "SELECT * FROM pending_registrations WHERE username = $1 AND verification_expires > NOW() LIMIT 1",
    [username]
  );
  return rows[0] || null;
}

export async function deleteByEmail(email: string): Promise<void> {
  await pool.query("DELETE FROM pending_registrations WHERE email = $1", [email]);
}

export async function deleteExpired(): Promise<void> {
  await pool.query("DELETE FROM pending_registrations WHERE verification_expires < NOW()");
}
