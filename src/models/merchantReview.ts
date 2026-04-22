import { pool } from "../config/db";

export interface MerchantReview {
  id: string;
  merchant_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface MerchantReviewWithUser extends MerchantReview {
  username: string;
  first_name: string;
}

export async function upsert(data: {
  merchant_id: string; user_id: string; rating: number; comment?: string | null;
}): Promise<MerchantReview> {
  const { rows } = await pool.query(
    `INSERT INTO merchant_reviews (merchant_id, user_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (merchant_id, user_id)
     DO UPDATE SET rating = $3, comment = $4, updated_at = NOW()
     RETURNING *`,
    [data.merchant_id, data.user_id, data.rating, data.comment || null]
  );
  return rows[0];
}

export async function findByMerchant(merchantId: string): Promise<MerchantReviewWithUser[]> {
  const { rows } = await pool.query(
    `SELECT r.*, u.username, u.first_name
     FROM merchant_reviews r
     JOIN users u ON u.id = r.user_id
     WHERE r.merchant_id = $1
     ORDER BY r.updated_at DESC`,
    [merchantId]
  );
  return rows;
}

export async function findByUserAndMerchant(userId: string, merchantId: string): Promise<MerchantReview | null> {
  const { rows } = await pool.query(
    "SELECT * FROM merchant_reviews WHERE user_id = $1 AND merchant_id = $2",
    [userId, merchantId]
  );
  return rows[0] || null;
}

export async function remove(id: string, userId: string): Promise<void> {
  await pool.query("DELETE FROM merchant_reviews WHERE id = $1 AND user_id = $2", [id, userId]);
}

export async function getAvgRating(merchantId: string): Promise<{ avg_rating: number | null; review_count: number }> {
  const { rows } = await pool.query(
    `SELECT COALESCE(AVG(rating), NULL) AS avg_rating, COUNT(id)::int AS review_count
     FROM merchant_reviews WHERE merchant_id = $1`,
    [merchantId]
  );
  return {
    avg_rating: rows[0].avg_rating ? parseFloat(rows[0].avg_rating) : null,
    review_count: rows[0].review_count,
  };
}
