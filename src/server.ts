import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config/env";
import { testConnection } from "./config/db";
import authRoutes from "./routes/auth";
import merchantAuthRoutes from "./routes/merchantAuth";

const app = express();
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => { res.json({ status: "ok" }); });
app.use("/api/auth", authRoutes);
app.use("/api/merchant/auth", merchantAuthRoutes);

async function start() { await testConnection(); app.listen(config.port, () => { console.log(`[NBK Market API] Running on port ${config.port}`); }); }
start();
