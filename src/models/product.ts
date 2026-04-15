import { pool } from "../config/db";

export interface Product {
  id: string;
  merchant_id: string;
  title: string;
  description: string;
  price: string;
  main_image: string;
  image_2: string | null;
  image_3: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWithRating extends Product {
  avg_rating: string | null;
  review_count: string;
  company_name: string;
}

export async function create(data: {
  merchant_id: string; title: string; description: string; price: number;
  main_image: string; image_2?: string | null; image_3?: string | null;
}): Promise<Product> {
  const { rows } = await pool.query(
    `INSERT INTO products (merchant_id, title, description, price, main_image, image_2, image_3)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [data.merchant_id, data.title, data.description, data.price, data.main_image, data.image_2 || null, data.image_3 || null]
  );
  return rows[0];
}

export async function findById(id: string): Promise<ProductWithRating | null> {
  const { rows } = await pool.query(
    `SELECT p.*, m.company_name,
       COALESCE(AVG(r.rating), NULL) AS avg_rating,
       COUNT(r.id)::text AS review_count
     FROM products p
     JOIN merchants m ON m.id = p.merchant_id
     LEFT JOIN reviews r ON r.product_id = p.id
     WHERE p.id = $1
     GROUP BY p.id, m.company_name`,
    [id]
  );
  return rows[0] || null;
}

export async function findByMerchant(merchantId: string): Promise<ProductWithRating[]> {
  const { rows } = await pool.query(
    `SELECT p.*, m.company_name,
       COALESCE(AVG(r.rating), NULL) AS avg_rating,
       COUNT(r.id)::text AS review_count
     FROM products p
     JOIN merchants m ON m.id = p.merchant_id
     LEFT JOIN reviews r ON r.product_id = p.id
     WHERE p.merchant_id = $1
     GROUP BY p.id, m.company_name
     ORDER BY p.created_at DESC`,
    [merchantId]
  );
  return rows;
}

export async function findAll(limit = 20, offset = 0): Promise<ProductWithRating[]> {
  const { rows } = await pool.query(
    `SELECT p.*, m.company_name,
       COALESCE(AVG(r.rating), NULL) AS avg_rating,
       COUNT(r.id)::text AS review_count
     FROM products p
     JOIN merchants m ON m.id = p.merchant_id
     LEFT JOIN reviews r ON r.product_id = p.id
     GROUP BY p.id, m.company_name
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function update(id: string, fields: Partial<Product>): Promise<Product> {
  const keys = Object.keys(fields).filter(k => k !== "id" && k !== "merchant_id");
  const values = keys.map(k => (fields as Record<string, unknown>)[k]);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const { rows } = await pool.query(
    `UPDATE products SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return rows[0];
}

export async function remove(id: string): Promise<void> {
  await pool.query("DELETE FROM products WHERE id = $1", [id]);
}
