import express from 'express';
import { createServer as createViteServer } from 'vite';
import { mockServerRouter } from './src/server/mock_server';
import { runPipeline } from './src/server/pipeline';
import yaml from 'yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Mock Server
  app.use('/api/mock', mockServerRouter);

  // Pipeline Execution Route
  app.post('/api/pipeline/run', async (req, res) => {
    try {
      const configPath = path.resolve(__dirname, 'src/server/config.yaml');
      const configFile = fs.readFileSync(configPath, 'utf8');
      const config = yaml.parse(configFile);

      const baseUrl = `http://localhost:${PORT}`;

      // Set up SSE for real-time progress updates
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const onProgress = (msg: string, data?: any) => {
        res.write(`data: ${JSON.stringify({ message: msg, data })}\n\n`);
      };

      await runPipeline(baseUrl, config, onProgress);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
