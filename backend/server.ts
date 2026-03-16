import express from 'express';
import cors from 'cors';
import validateRouter from './routes/validate';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'http://localhost:3001' }));
app.use(express.json());

app.use('/api', validateRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`SCIM Validator backend running on http://localhost:${PORT}`);
});

export default app;
