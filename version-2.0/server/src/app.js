import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import clientRoutes from './routes/clients.js';
import settingsRoutes from './routes/settings.js';
import reportsRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import uploadRoutes from './routes/uploads.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.get('/', (_req, res) => {
  res.json({
    name: 'onboarding-v2-api',
    ok: true,
    docs: {
      health: '/api/health',
      authLogin: '/api/auth/login',
    },
  });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/uploads', uploadRoutes);

// If a built React app exists, serve it from the API server (useful for single-origin deployments).
const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const clientDistDir = path.resolve(currentDir, '../../client/dist');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

export default app;
