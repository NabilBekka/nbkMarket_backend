import { Request, Response } from "express";
import * as MerchantReviewModel from "../models/merchantReview";
import * as MerchantModel from "../models/merchant";
import { AuthRequest } from "../middlewares/auth";

// POST /api/merchants/:merchantId/reviews — client rates a shop
export async function upsert(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    const { merchantId } = req.params;
    const { rating, comment } = req.body;

    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) return res.status(404).json({ error: "Shop not found" });

    if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
    }

    const review = await MerchantReviewModel.upsert({
      merchant_id: merchantId,
      user_id: req.userId,
      rating,
      comment: comment?.trim() || null,
    });

    return res.status(201).json({ review });
  } catch (err) {
    console.error("[MERCHANT_REVIEW] Upsert:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/merchants/:merchantId/reviews — get all reviews for a shop
export async function getByMerchant(req: Request, res: Response) {
  try {
    const { merchantId } = req.params;

    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) return res.status(404).json({ error: "Shop not found" });

    const reviews = await MerchantReviewModel.findByMerchant(merchantId);
    const { avg_rating, review_count } = await MerchantReviewModel.getAvgRating(merchantId);

    return res.json({ reviews, avg_rating, review_count });
  } catch (err) {
    console.error("[MERCHANT_REVIEW] GetByMerchant:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// DELETE /api/merchants/:merchantId/reviews — client deletes their own review
export async function remove(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    const { merchantId } = req.params;

    const review = await MerchantReviewModel.findByUserAndMerchant(req.userId, merchantId);
    if (!review) return res.status(404).json({ error: "Review not found" });

    await MerchantReviewModel.remove(review.id, req.userId);
    return res.json({ message: "Review deleted" });
  } catch (err) {
    console.error("[MERCHANT_REVIEW] Delete:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/merchants/:merchantId — get shop info with avg rating
export async function getShopInfo(req: Request, res: Response) {
  try {
    const { merchantId } = req.params;

    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) return res.status(404).json({ error: "Shop not found" });

    const { avg_rating, review_count } = await MerchantReviewModel.getAvgRating(merchantId);

    return res.json({
      shop: {
        id: merchant.id,
        company_name: merchant.company_name,
        category_id: merchant.category_id,
        wilaya_code: merchant.wilaya_code,
        profile_image: merchant.profile_image,
        cover_image: merchant.cover_image,
        address: merchant.address,
        description: merchant.description,
        sells_buys: merchant.sells_buys,
        offers_services: merchant.offers_services,
        has_physical_shop: merchant.has_physical_shop,
        offers_delivery: merchant.offers_delivery,
        avg_rating,
        review_count,
        created_at: merchant.created_at,
      },
    });
  } catch (err) {
    console.error("[MERCHANT_REVIEW] GetShopInfo:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
