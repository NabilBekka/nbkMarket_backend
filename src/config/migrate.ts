import { pool } from "./db";

const migration = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('client', 'merchant');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE,
    birth_date DATE,
    role user_role NOT NULL DEFAULT 'client',
    google_id VARCHAR(255) UNIQUE,
    is_verified BOOLEAN DEFAULT false,
    verification_code VARCHAR(6),
    verification_expires TIMESTAMPTZ,
    reset_code VARCHAR(6),
    reset_expires TIMESTAMPTZ,
    refresh_token VARCHAR(500),
    lang VARCHAR(2) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
`;

async function migrate() {
  try {
    console.log("[MIGRATE] Running migrations...");
    await pool.query(migration);
    console.log("[MIGRATE] Done.");
    process.exit(0);
  } catch (err) {
    console.error("[MIGRATE] Failed:", err);
    process.exit(1);
  }
}

migrate();
