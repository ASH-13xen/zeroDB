import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoute.js";
import aiRoutes from "./routes/aiRoute.js";
import dbRoutes from "./routes/dbRoute.js";
import historyRoutes from "./routes/historyRoute.js";
import shareRoutes from "./routes/shareRoute.js";
import cron from "node-cron";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/db", dbRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/share", shareRoutes);

// Cleanup Cron Job: Runs every hour to delete files older than 24 hours
cron.schedule("0 * * * *", () => {
  const uploadsDir = path.join(__dirname, "uploads");
  if (fs.existsSync(uploadsDir)) {
    fs.readdir(uploadsDir, (err, files) => {
      if (err) return console.error("Cron read dir error:", err);
      const now = Date.now();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      files.forEach((file) => {
        const filePath = path.join(uploadsDir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) return console.error("Cron stat error:", err);
          if (now - stats.mtimeMs > ONE_DAY_MS) {
            fs.unlink(filePath, (err) => {
              if (err) console.error("Cron unlink error:", err);
              else console.log(`Deleted expired file: ${file}`);
            });
          }
        });
      });
    });
  }
});

app.get("/", (req, res) => {
  res.send("SircuS API is running smoothly...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`,
  );
});
