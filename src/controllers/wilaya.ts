import { Request, Response } from "express";
import * as WilayaModel from "../models/wilaya";

// GET /api/wilayas — list all 69 wilayas
export async function getAll(_req: Request, res: Response) {
  try {
    const wilayas = await WilayaModel.findAll();
    return res.json({ wilayas });
  } catch (err) {
    console.error("[WILAYA] GetAll:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
