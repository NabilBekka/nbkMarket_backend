import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config/env";
import { testConnection } from "./config/db";
import authRoutes from "./routes/auth";

const app = express();

app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "nbk-market-api" });
});

app.use("/api/auth", authRoutes);

async function start() {
  await testConnection();
  app.listen(config.port, () => {
    console.log(`[NBK Market API] Running on port ${config.port}`);
  });
}

start();
