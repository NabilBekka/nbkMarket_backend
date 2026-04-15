import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../middlewares/auth";
import { upload } from "../middlewares/upload";
import * as UploadController from "../controllers/upload";

const router = Router();

// POST /api/upload — upload single image (field name: "image")
router.post(
  "/",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File too large (max 5MB)" });
        }
        return res.status(400).json({ error: err.message || "Upload failed" });
      }
      next();
    });
  },
  UploadController.uploadImage as any
);

// DELETE /api/upload — delete an image
router.delete("/", authMiddleware, UploadController.deleteImage as any);

export default router;
