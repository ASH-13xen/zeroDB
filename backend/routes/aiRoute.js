import express from 'express';
import { generateMockData, generateSqlQuery } from '../controllers/aiController.js';

const router = express.Router();

// POST /api/ai/mock-data
router.post('/mock-data', generateMockData);

// POST /api/ai/generate-query
router.post('/generate-query', generateSqlQuery);

export default router;
