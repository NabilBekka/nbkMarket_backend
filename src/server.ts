import express from "express";
import cors from "cors";
import { config } from "./config/env";

const app = express();

app.use(cors({ origin: config.corsOrigins }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "nbk-market-api" });
});

app.listen(config.port, () => {
  console.log(`[NBK Market API] Running on port ${config.port}`);
});
