import express from 'express';
import { YtLinkMeta,YtDownload } from './controllers/YTController.js';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:8080', // Vite's default port
  credentials: true
}));

app.use(express.json());

app.get('/', (_req, res) => {
  res.send('Hello from Express + TypeScript + ESM!');
});

// app.get('/yt-download', YTD);
app.post('/api/get-meta-link', YtLinkMeta); // Add the route your frontend is expecting
app.post('/api/download-video',YtDownload);

// Test endpoint to verify yt-dlp is working
app.get('/api/test-ytdlp', async (_req, res) => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync('yt-dlp --version');
    res.json({ success: true, version: stdout.trim() });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
