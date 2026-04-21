import { Router } from "express";
import * as SearchController from "../controllers/search";

const router = Router();

router.get("/suggest", SearchController.suggest);
router.get("/products", SearchController.searchProducts);
router.get("/shops", SearchController.searchShops);

export default router;
