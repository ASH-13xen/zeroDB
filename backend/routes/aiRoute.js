import express from 'express';
import { generateMockData, generateSqlQuery } from '../controllers/aiController.js';

const router = express.Router();

// POST /api/ai/mock-data
router.post('/mock-data', generateMockData);

// POST /api/ai/generate-query
router.post('/generate-query', generateSqlQuery);

// POST /api/ai/optimize-query
router.post('/optimize-query', (req, res, next) => {
    import('../controllers/aiController.js').then(ctrl => ctrl.optimizeQuery(req, res)).catch(next);
});

export default router;
