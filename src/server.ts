import express from "express";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import { config } from "./config/env";
import { testConnection } from "./config/db";
import authRoutes from "./routes/auth";
import merchantAuthRoutes from "./routes/merchantAuth";
import productRoutes from "./routes/product";
import uploadRoutes from "./routes/upload";

const app = express();
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve uploaded images as static files
// Example: http://localhost:5000/uploads/products/1713456789-abc123.jpg
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => { res.json({ status: "ok" }); });
app.use("/api/auth", authRoutes);
app.use("/api/merchant/auth", merchantAuthRoutes);
app.use("/api/products", productRoutes);
app.use("/api/upload", uploadRoutes);

async function start() { await testConnection(); app.listen(config.port, () => { console.log(`[NBK Market API] Running on port ${config.port}`); }); }
start();
