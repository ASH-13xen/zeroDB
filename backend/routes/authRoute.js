import express from "express";
import { googleLogin } from "../controllers/authController.js";
import { protect } from "../middlewares/authmiddleware.js";
import {
  getWorkspace,
  saveWorkspace,
} from "../controllers/workspaceController.js";
const router = express.Router();

// POST /api/auth/google
router.post("/google", googleLogin);
router.get("/workspace", protect, getWorkspace);
router.put("/workspace/save", protect, saveWorkspace);
export default router;
