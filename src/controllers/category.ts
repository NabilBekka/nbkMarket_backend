import { Request, Response } from "express";
import * as CategoryModel from "../models/category";

// GET /api/categories/search?q=pat&lang=fr&offset=0
export async function search(req: Request, res: Response) {
  try {
    const q = (req.query.q as string || "").trim();
    const lang = (req.query.lang as string) === "fr" ? "fr" : "en";
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const limit = 5;

    if (q.length < 1) {
      return res.json({ categories: [], hasMore: false, total: 0 });
    }

    const { categories, total } = await CategoryModel.search(q, lang, limit, offset);

    const formatted = categories.map((c) => ({
      id: c.id,
      name: lang === "fr" ? c.name_fr : c.name_en,
      parentName: lang === "fr" ? c.parent_name_fr : c.parent_name_en,
      display: `${lang === "fr" ? c.name_fr : c.name_en} (${lang === "fr" ? c.parent_name_fr : c.parent_name_en})`,
    }));

    return res.json({
      categories: formatted,
      hasMore: offset + limit < total,
      total,
    });
  } catch (err) {
    console.error("[CATEGORY] Search:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/categories/:id
export async function getById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid category ID" });

    const category = await CategoryModel.findById(id);
    if (!category) return res.status(404).json({ error: "Category not found" });

    return res.json({ category });
  } catch (err) {
    console.error("[CATEGORY] GetById:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
