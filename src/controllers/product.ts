import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import * as ProductModel from "../models/product";
import * as SearchModel from "../models/search";
import { AuthRequest } from "../middlewares/auth";

function sanitize(p: ProductModel.ProductWithRating) {
  return {
    id: p.id,
    merchant_id: p.merchant_id,
    company_name: p.company_name,
    title: p.title,
    description: p.description,
    price: parseFloat(p.price),
    main_image: p.main_image,
    image_2: p.image_2,
    image_3: p.image_3,
    avg_rating: p.avg_rating ? parseFloat(p.avg_rating) : null,
    review_count: parseInt(p.review_count, 10),
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

// POST /api/products — merchant creates a product
export async function create(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    const { title, description, price, main_image, image_2, image_3 } = req.body;

    if (!title || !title.trim()) return res.status(400).json({ error: "Title is required" });
    if (!description || !description.trim()) return res.status(400).json({ error: "Description is required" });
    if (price === undefined || price === null || isNaN(price) || price <= 0) return res.status(400).json({ error: "Price must be a positive number" });
    if (!main_image || !main_image.trim()) return res.status(400).json({ error: "Main image is required" });

    const product = await ProductModel.create({
      merchant_id: req.userId,
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price),
      main_image: main_image.trim(),
      image_2: image_2?.trim() || null,
      image_3: image_3?.trim() || null,
    });

    return res.status(201).json({ product });
  } catch (err) {
    console.error("[PRODUCT] Create:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/products — list all products
export async function getAll(req: Request, res: Response) {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const products = await ProductModel.findAll(limit, offset);
    return res.json({ products: products.map(sanitize) });
  } catch (err) {
    console.error("[PRODUCT] GetAll:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/products/:id — single product
export async function getById(req: Request, res: Response) {
  try {
    const product = await ProductModel.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json({ product: sanitize(product) });
  } catch (err) {
    console.error("[PRODUCT] GetById:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/products/merchant/:merchantId — products by merchant
export async function getByMerchant(req: Request, res: Response) {
  try {
    const products = await ProductModel.findByMerchant(req.params.merchantId);
    return res.json({ products: products.map(sanitize) });
  } catch (err) {
    console.error("[PRODUCT] GetByMerchant:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/products/my/list?q=ecouteur&lang=fr — merchant's own products (with optional fuzzy search)
export async function getMyProducts(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    const q = (req.query.q as string || "").trim();
    const lang = (req.query.lang as string) === "fr" ? "fr" : "en";

    if (q.length > 0) {
      const results = await SearchModel.searchMyProducts(q, req.userId, lang);
      const formatted = results.map(r => ({
        id: r.id, title: r.title, price: parseFloat(r.price),
        main_image: r.main_image, avg_rating: r.avg_rating ? parseFloat(r.avg_rating) : null,
        review_count: parseInt(r.review_count, 10), company_name: r.company_name,
        merchant_id: r.merchant_id, created_at: null, updated_at: null,
      }));
      return res.json({ products: formatted });
    }

    const products = await ProductModel.findByMerchant(req.userId);
    return res.json({ products: products.map(sanitize) });
  } catch (err) {
    console.error("[PRODUCT] GetMy:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// PUT /api/products/:id — merchant updates their product
export async function update(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    const existing = await ProductModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found" });
    if (existing.merchant_id !== req.userId) return res.status(403).json({ error: "Not your product" });

    const { title, description, price, main_image, image_2, image_3 } = req.body;
    const fields: Partial<ProductModel.Product> = {};

    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ error: "Title cannot be empty" });
      fields.title = title.trim();
    }
    if (description !== undefined) {
      if (!description.trim()) return res.status(400).json({ error: "Description cannot be empty" });
      fields.description = description.trim();
    }
    if (price !== undefined) {
      if (isNaN(price) || price <= 0) return res.status(400).json({ error: "Price must be a positive number" });
      fields.price = price.toString();
    }
    if (main_image !== undefined) {
      if (!main_image.trim()) return res.status(400).json({ error: "Main image cannot be empty" });
      if (existing.main_image && existing.main_image !== main_image.trim()) {
        try { const fp = existing.main_image.includes("/uploads/") ? existing.main_image.substring(existing.main_image.indexOf("/uploads/")) : null; if (fp) { const full = path.join(process.cwd(), fp); if (fs.existsSync(full)) fs.unlinkSync(full); } } catch (e) { /* ignore */ }
      }
      fields.main_image = main_image.trim();
    }
    if (image_2 !== undefined) {
      if (existing.image_2 && existing.image_2 !== (image_2?.trim() || null)) {
        try { const fp = existing.image_2.includes("/uploads/") ? existing.image_2.substring(existing.image_2.indexOf("/uploads/")) : null; if (fp) { const full = path.join(process.cwd(), fp); if (fs.existsSync(full)) fs.unlinkSync(full); } } catch (e) { /* ignore */ }
      }
      fields.image_2 = image_2?.trim() || null;
    }
    if (image_3 !== undefined) {
      if (existing.image_3 && existing.image_3 !== (image_3?.trim() || null)) {
        try { const fp = existing.image_3.includes("/uploads/") ? existing.image_3.substring(existing.image_3.indexOf("/uploads/")) : null; if (fp) { const full = path.join(process.cwd(), fp); if (fs.existsSync(full)) fs.unlinkSync(full); } } catch (e) { /* ignore */ }
      }
      fields.image_3 = image_3?.trim() || null;
    }

    if (!Object.keys(fields).length) return res.json({ message: "No changes" });

    const updated = await ProductModel.update(req.params.id, fields);
    return res.json({ product: updated });
  } catch (err) {
    console.error("[PRODUCT] Update:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// DELETE /api/products/:id — merchant deletes their product
export async function remove(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    const existing = await ProductModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found" });
    if (existing.merchant_id !== req.userId) return res.status(403).json({ error: "Not your product" });

    // Delete image files from disk
    const images = [existing.main_image, existing.image_2, existing.image_3].filter(Boolean) as string[];
    for (const img of images) {
      try {
        // Extract path: "/uploads/products/xxx.jpg" or full URL
        const filePath = img.includes("/uploads/") ? img.substring(img.indexOf("/uploads/")) : null;
        if (filePath) {
          const fullPath = path.join(process.cwd(), filePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log("[PRODUCT] Deleted image:", fullPath);
          }
        }
      } catch (e) { console.error("[PRODUCT] Failed to delete image:", img, e); }
    }

    await ProductModel.remove(req.params.id);
    return res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("[PRODUCT] Delete:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
