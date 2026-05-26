import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { savePostgresUri, getPostgresUri, executePostgresQuery, getPostgresSchema } from "../controllers/dbController.js";

const router = express.Router();

router.get("/postgres-uri", protect, getPostgresUri);
router.post("/postgres-uri", protect, savePostgresUri);
router.post("/execute", protect, executePostgresQuery);
router.get("/schema", protect, getPostgresSchema);

export default router;
