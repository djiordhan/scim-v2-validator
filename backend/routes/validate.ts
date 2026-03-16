import { Router, Request, Response } from 'express';
import { runAllTests } from '../services/scimTests';

const router = Router();

router.post('/validate', async (req: Request, res: Response) => {
  const { baseUrl, token, customHeaders } = req.body;

  if (!baseUrl || !token) {
    return res.status(400).json({ error: 'baseUrl and token are required' });
  }

  try {
    const results = await runAllTests({ baseUrl, token, customHeaders: customHeaders || {} });
    return res.json({ results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
