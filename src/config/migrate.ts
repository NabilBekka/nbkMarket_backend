import { pool } from "./db";

const migration = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  CREATE EXTENSION IF NOT EXISTS "unaccent";
  CREATE EXTENSION IF NOT EXISTS "pg_trgm";

  DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('client', 'merchant');
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, username VARCHAR(50) UNIQUE, birth_date DATE,
    role user_role NOT NULL DEFAULT 'client', google_id VARCHAR(255) UNIQUE, is_verified BOOLEAN DEFAULT true,
    reset_code VARCHAR(6), reset_expires TIMESTAMPTZ, refresh_token VARCHAR(500), lang VARCHAR(2) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS pending_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) NOT NULL, password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, username VARCHAR(50) NOT NULL, birth_date DATE,
    lang VARCHAR(2) DEFAULT 'en', verification_code VARCHAR(6) NOT NULL, verification_expires TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS wilayas (
    code INTEGER PRIMARY KEY,
    name_fr VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    name_en VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100) NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
  CREATE INDEX IF NOT EXISTS idx_categories_name_en ON categories(name_en);
  CREATE INDEX IF NOT EXISTS idx_categories_name_fr ON categories(name_fr);

  CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, company_name VARCHAR(100) UNIQUE NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    wilaya_code INTEGER REFERENCES wilayas(code),
    sells_buys BOOLEAN DEFAULT false,
    offers_services BOOLEAN DEFAULT false,
    has_physical_shop BOOLEAN DEFAULT false,
    offers_delivery BOOLEAN DEFAULT false,
    reset_code VARCHAR(6), reset_expires TIMESTAMPTZ, refresh_token VARCHAR(500),
    lang VARCHAR(2) DEFAULT 'en', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS pending_merchant_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) NOT NULL, password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, company_name VARCHAR(100) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    wilaya_code INTEGER REFERENCES wilayas(code),
    sells_buys BOOLEAN DEFAULT false,
    offers_services BOOLEAN DEFAULT false,
    has_physical_shop BOOLEAN DEFAULT false,
    offers_delivery BOOLEAN DEFAULT false,
    delivery_wilayas TEXT DEFAULT '[]',
    lang VARCHAR(2) DEFAULT 'en', verification_code VARCHAR(6) NOT NULL, verification_expires TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS merchant_delivery_wilayas (
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    wilaya_code INTEGER NOT NULL REFERENCES wilayas(code),
    PRIMARY KEY (merchant_id, wilaya_code)
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
  CREATE INDEX IF NOT EXISTS idx_pending_email ON pending_registrations(email);
  CREATE INDEX IF NOT EXISTS idx_pending_username ON pending_registrations(username);
  CREATE INDEX IF NOT EXISTS idx_merchants_email ON merchants(email);
  CREATE INDEX IF NOT EXISTS idx_merchants_company ON merchants(company_name);
  CREATE INDEX IF NOT EXISTS idx_merchants_category ON merchants(category_id);
  CREATE INDEX IF NOT EXISTS idx_merchants_wilaya ON merchants(wilaya_code);
  CREATE INDEX IF NOT EXISTS idx_delivery_merchant ON merchant_delivery_wilayas(merchant_id);
  CREATE INDEX IF NOT EXISTS idx_delivery_wilaya ON merchant_delivery_wilayas(wilaya_code);
  CREATE INDEX IF NOT EXISTS idx_pending_merchant_email ON pending_merchant_registrations(email);
  CREATE INDEX IF NOT EXISTS idx_pending_merchant_company ON pending_merchant_registrations(company_name);

  CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    main_image VARCHAR(500) NOT NULL,
    image_2 VARCHAR(500),
    image_3 VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS merchant_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(merchant_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
  CREATE INDEX IF NOT EXISTS idx_merchant_reviews_merchant ON merchant_reviews(merchant_id);
  CREATE INDEX IF NOT EXISTS idx_merchant_reviews_user ON merchant_reviews(user_id);
`;

async function migrate() {
  try { console.log("[MIGRATE] Running..."); await pool.query(migration); console.log("[MIGRATE] Done."); process.exit(0); }
  catch (err) { console.error("[MIGRATE] Failed:", err); process.exit(1); }
}
migrate();
