import { pool } from "../config/db";

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewWithUser extends Review {
  username: string;
  first_name: string;
}

export async function upsert(data: {
  product_id: string; user_id: string; rating: number; comment?: string | null;
}): Promise<Review> {
  const { rows } = await pool.query(
    `INSERT INTO reviews (product_id, user_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (product_id, user_id)
     DO UPDATE SET rating = $3, comment = $4, updated_at = NOW()
     RETURNING *`,
    [data.product_id, data.user_id, data.rating, data.comment || null]
  );
  return rows[0];
}

export async function findByProduct(productId: string): Promise<ReviewWithUser[]> {
  const { rows } = await pool.query(
    `SELECT r.*, u.username, u.first_name
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     WHERE r.product_id = $1
     ORDER BY r.updated_at DESC`,
    [productId]
  );
  return rows;
}

export async function findByUserAndProduct(userId: string, productId: string): Promise<Review | null> {
  const { rows } = await pool.query(
    "SELECT * FROM reviews WHERE user_id = $1 AND product_id = $2",
    [userId, productId]
  );
  return rows[0] || null;
}

export async function remove(id: string, userId: string): Promise<void> {
  await pool.query("DELETE FROM reviews WHERE id = $1 AND user_id = $2", [id, userId]);
}
