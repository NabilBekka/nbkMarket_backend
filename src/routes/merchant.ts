import { Router } from "express";
import * as MerchantReviewController from "../controllers/merchantReview";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

// Public
router.get("/:merchantId", MerchantReviewController.getShopInfo);
router.get("/:merchantId/reviews", MerchantReviewController.getByMerchant);

// Client only (authenticated)
router.post("/:merchantId/reviews", authMiddleware, MerchantReviewController.upsert);
router.delete("/:merchantId/reviews", authMiddleware, MerchantReviewController.remove);

export default router;
