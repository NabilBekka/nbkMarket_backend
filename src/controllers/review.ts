import { Request, Response } from "express";
import * as ReviewModel from "../models/review";
import * as ProductModel from "../models/product";
import { AuthRequest } from "../middlewares/auth";

// POST /api/products/:productId/reviews — client creates or updates their review
export async function upsert(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    const { productId } = req.params;
    const { rating, comment } = req.body;

    // Check product exists
    const product = await ProductModel.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    // Validate rating
    if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
    }

    const review = await ReviewModel.upsert({
      product_id: productId,
      user_id: req.userId,
      rating,
      comment: comment?.trim() || null,
    });

    return res.status(201).json({ review });
  } catch (err) {
    console.error("[REVIEW] Upsert:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/products/:productId/reviews — get all reviews for a product
export async function getByProduct(req: Request, res: Response) {
  try {
    const { productId } = req.params;

    const product = await ProductModel.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const reviews = await ReviewModel.findByProduct(productId);
    return res.json({ reviews });
  } catch (err) {
    console.error("[REVIEW] GetByProduct:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// DELETE /api/products/:productId/reviews — client deletes their own review
export async function remove(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    const { productId } = req.params;

    const review = await ReviewModel.findByUserAndProduct(req.userId, productId);
    if (!review) return res.status(404).json({ error: "Review not found" });

    await ReviewModel.remove(review.id, req.userId);
    return res.json({ message: "Review deleted" });
  } catch (err) {
    console.error("[REVIEW] Delete:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
