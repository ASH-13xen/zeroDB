import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { addQueryHistory, getQueryHistory, clearQueryHistory } from "../controllers/historyController.js";

const router = express.Router();

router.post("/", protect, addQueryHistory);
router.get("/", protect, getQueryHistory);
router.delete("/", protect, clearQueryHistory);

export default router;
