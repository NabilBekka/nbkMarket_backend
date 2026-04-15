import { Response } from "express";
import fs from "fs";
import path from "path";
import { AuthRequest } from "../middlewares/auth";

// POST /api/upload — upload a single image, returns the path
export async function uploadImage(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Return the public path to the file
    const filePath = `/uploads/products/${req.file.filename}`;

    return res.status(201).json({ path: filePath });
  } catch (err) {
    console.error("[UPLOAD] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// DELETE /api/upload — delete an uploaded image (by path)
export async function deleteImage(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { filePath } = req.body;
    if (!filePath || !filePath.startsWith("/uploads/products/")) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    const fullPath = path.join(process.cwd(), filePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    return res.status(200).json({ message: "File deleted" });
  } catch (err) {
    console.error("[UPLOAD] Delete error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
