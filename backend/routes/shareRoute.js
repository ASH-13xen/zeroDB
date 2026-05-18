import express from "express";
import multer from "multer";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import { uploadDatabase, downloadDatabase } from "../controllers/shareController.js";
import { protect } from "../middlewares/authmiddleware.js";

const router = express.Router();

// Ensure upload directory exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Optional auth middleware for downloading public databases
const optionalAuth = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id };
    } catch (error) {
      // Ignore token verification errors for optional auth
    }
  }
  next();
};

// Routes
router.post("/upload", protect, upload.single("databaseFile"), uploadDatabase);
router.get("/:shareId", optionalAuth, downloadDatabase);

export default router;
