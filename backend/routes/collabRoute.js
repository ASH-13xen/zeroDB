import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createInvitation, getPendingInvitations, respondToInvitation } from "../controllers/collabController.js";

const router = express.Router();

// All collaboration endpoints require authentication
router.post("/invite", protect, createInvitation);
router.get("/invitations", protect, getPendingInvitations);
router.post("/respond", protect, respondToInvitation);

export default router;
