import express from "express";
import { protect } from "../middlewares/authmiddleware.js";
import { savePostgresUri, getPostgresUri, executePostgresQuery } from "../controllers/dbController.js";

const router = express.Router();

router.get("/postgres-uri", protect, getPostgresUri);
router.post("/postgres-uri", protect, savePostgresUri);
router.post("/execute", protect, executePostgresQuery);

export default router;
