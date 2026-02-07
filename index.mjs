import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir, readFile, rename, writeFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number.parseInt(process.env.PORT ?? '8081', 10);
const DATA_DIR = path.join(__dirname, 'data');

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readJsonFile(filename, defaultValue = []) {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

async function writeJsonFile(filename, data) {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  const tmpPath = `${filePath}.tmp`;
  const payload = JSON.stringify(data, null, 2);
  await writeFile(tmpPath, payload, 'utf8');
  await rename(tmpPath, filePath);
}

const app = express();

// CORS configuration
app.use(cors({
  origin: 'https://lignesh-portfolio-jf9jbjobr-suhas-projects-c2a4b70d.vercel.app',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const users = await readJsonFile('users.json', []);
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    res.json({ success: true, username: user.username });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Generic generic handler factory
const createCrudHandlers = (filename, isObject = false) => {
  const endpoint = `/api/${path.basename(filename, '.json')}`;

  app.get(endpoint, async (_req, res) => {
    const data = await readJsonFile(filename, isObject ? {} : []);
    res.json(data);
  });

  app.put(endpoint, async (req, res) => {
    const data = req.body;
    await writeJsonFile(filename, data);
    res.json(data);
  });
};

// Register endpoints
createCrudHandlers('publications.json');
createCrudHandlers('courses.json');
createCrudHandlers('contact.json', true);
createCrudHandlers('academic.json');
createCrudHandlers('memberships.json');
createCrudHandlers('supervision.json');
createCrudHandlers('awards.json');

// Serve built frontend if present (for single-node deployment)
const distDir = path.join(path.dirname(__dirname), 'dist');
app.use(express.static(distDir));

// SPA fallback (React Router) - match any non-API path
app.get(/^\/(?!api\/).*/, (req, res, next) => {
  res.sendFile(path.join(distDir, 'index.html'), err => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on http://localhost:${PORT}`);
});
