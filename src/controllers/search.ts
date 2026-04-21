import { Request, Response } from "express";
import * as SearchModel from "../models/search";

// GET /api/search/suggest?q=ecoutor&type=product&lang=fr
export async function suggest(req: Request, res: Response) {
  try {
    const q = (req.query.q as string || "").trim();
    const type = (req.query.type as string) === "shop" ? "shop" : "product";
    const lang = (req.query.lang as string) === "fr" ? "fr" : "en";

    if (q.length < 1) return res.json({ suggestions: [] });

    const suggestions = type === "shop"
      ? await SearchModel.suggestShops(q, lang)
      : await SearchModel.suggestProducts(q, lang);

    return res.json({ suggestions });
  } catch (err) {
    console.error("[SEARCH] Suggest:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/search/products?q=ecoutor&lang=fr&limit=20&offset=0
export async function searchProducts(req: Request, res: Response) {
  try {
    const q = (req.query.q as string || "").trim();
    const lang = (req.query.lang as string) === "fr" ? "fr" : "en";
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    if (q.length < 1) return res.json({ results: [], total: 0 });

    const { results, total } = await SearchModel.searchProducts(q, lang, limit, offset);

    const formatted = results.map(r => ({
      id: r.id,
      title: r.title,
      price: parseFloat(r.price),
      main_image: r.main_image,
      avg_rating: r.avg_rating ? parseFloat(r.avg_rating) : null,
      review_count: parseInt(r.review_count, 10),
      company_name: r.company_name,
      merchant_id: r.merchant_id,
      category_name: r.category_name,
    }));

    return res.json({ results: formatted, total });
  } catch (err) {
    console.error("[SEARCH] Products:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/search/shops?q=boulangerie&lang=fr&limit=20&offset=0
export async function searchShops(req: Request, res: Response) {
  try {
    const q = (req.query.q as string || "").trim();
    const lang = (req.query.lang as string) === "fr" ? "fr" : "en";
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    if (q.length < 1) return res.json({ results: [], total: 0 });

    const { results, total } = await SearchModel.searchShops(q, lang, limit, offset);

    return res.json({ results, total });
  } catch (err) {
    console.error("[SEARCH] Shops:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
