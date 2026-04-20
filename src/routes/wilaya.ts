import { Router } from "express";
import * as WilayaController from "../controllers/wilaya";

const router = Router();

router.get("/", WilayaController.getAll);

export default router;
