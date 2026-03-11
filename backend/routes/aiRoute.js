import express from 'express';
import { generateMockData } from '../controllers/aiController.js';

const router = express.Router();

// POST /api/ai/mock-data
router.post('/mock-data', generateMockData);

export default router;
