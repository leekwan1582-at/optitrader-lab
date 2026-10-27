import cors from 'cors';
import express from 'express';
import assistantRoutes from './routes/assistantRoutes.js';
import authRoutes from './routes/authRoutes.js';
import datasetRoutes from './routes/datasetRoutes.js';
import miscRoutes from './routes/miscRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import runRoutes from './routes/runRoutes.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp(config) {
  const app = express();

  app.disable('x-powered-by');
  app.locals.config = config;

  app.use(cors({
    origin: config.clientUrl,
    credentials: true,
  }));
  app.use(express.json({ limit: '25mb' }));

  app.use('/api', miscRoutes);
  app.use('/api/auth', authRoutes);

  app.use('/api', requireAuth);
  app.use('/api/datasets', datasetRoutes);
  app.use('/api/profiles', profileRoutes);
  app.use('/api/runs', runRoutes);
  app.use('/api/assistant', assistantRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
