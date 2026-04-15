import { Router } from "express";
import * as ProductController from "../controllers/product";
import * as ReviewController from "../controllers/review";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

// Merchant only (authenticated) - must be before /:id
router.post("/", authMiddleware, ProductController.create);
router.get("/my/list", authMiddleware, ProductController.getMyProducts);

// Public
router.get("/", ProductController.getAll);
router.get("/merchant/:merchantId", ProductController.getByMerchant);
router.get("/:id", ProductController.getById);
router.get("/:productId/reviews", ReviewController.getByProduct);

// Merchant only (authenticated)
router.put("/:id", authMiddleware, ProductController.update);
router.delete("/:id", authMiddleware, ProductController.remove);

// Client only (authenticated)
router.post("/:productId/reviews", authMiddleware, ReviewController.upsert);
router.delete("/:productId/reviews", authMiddleware, ReviewController.remove);

export default router;
