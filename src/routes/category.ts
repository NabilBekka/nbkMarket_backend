import { Router } from "express";
import * as CategoryController from "../controllers/category";

const router = Router();

router.get("/search", CategoryController.search);
router.get("/:id", CategoryController.getById);

export default router;
