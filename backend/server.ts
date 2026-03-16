import express from 'express';
import cors from 'cors';
import path from 'path';
import validateRouter from './routes/validate';
import entraRouter from './routes/entra';

const app = express();
const PORT = process.env.PORT || 3100;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors({ origin: isProd ? false : 'http://localhost:3001' }));
app.use(express.json());

app.use('/api', validateRouter);
app.use('/api/entra', entraRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

if (isProd) {
  const staticDir = path.join(__dirname, 'public');
  app.use(express.static(staticDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`SCIM Validator running on http://localhost:${PORT}`);
});

export default app;
