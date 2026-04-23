import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Initialize SQLite Database
  const db = new Database('scheduler.db');
  db.pragma('journal_mode = WAL');

  // Database Schema Setup
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      value TEXT
    );
    
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT
    );
    
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT, -- main, activity
      periods_per_week INTEGER DEFAULT 1
    );
    
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT -- main, lab, etc
    );
    
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      group_id TEXT,
      subject_id TEXT,
      teacher_id TEXT,
      room_id TEXT,
      backup_room_id TEXT,
      periods_per_week INTEGER,
      FOREIGN KEY(group_id) REFERENCES groups(id),
      FOREIGN KEY(subject_id) REFERENCES subjects(id),
      FOREIGN KEY(teacher_id) REFERENCES teachers(id),
      FOREIGN KEY(room_id) REFERENCES rooms(id),
      FOREIGN KEY(backup_room_id) REFERENCES rooms(id)
    );
    
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // --- API Routes ---
  
  // Generic CRUD for common entities
  const entities = ['teachers', 'subjects', 'rooms', 'groups', 'assignments'];
  entities.forEach(entity => {
    app.get(`/api/${entity}`, (req, res) => {
      const data = db.prepare(`SELECT * FROM ${entity}`).all();
      res.json(data);
    });

    app.post(`/api/${entity}`, (req, res) => {
      const fields = Object.keys(req.body);
      const placeholders = fields.map(() => '?').join(',');
      const values = Object.values(req.body);
      try {
        db.prepare(`INSERT OR REPLACE INTO ${entity} (${fields.join(',')}) VALUES (${placeholders})`).run(...values);
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.delete(`/api/${entity}/:id`, (req, res) => {
      db.prepare(`DELETE FROM ${entity} WHERE id = ?`).run(req.params.id);
      res.json({ success: true });
    });
  });

  // Settings
  app.get('/api/settings', (req, res) => {
    const data = db.prepare('SELECT * FROM settings').all();
    const settings: Record<string, any> = {};
    data.forEach((row: any) => settings[row.id] = JSON.parse(row.value));
    res.json(settings);
  });

  app.post('/api/settings', (req, res) => {
    const { id, value } = req.body;
    db.prepare('INSERT OR REPLACE INTO settings (id, value) VALUES (?, ?)').run(id, JSON.stringify(value));
    res.json({ success: true });
  });

  // Schedule persistence
  app.get('/api/schedule/latest', (req, res) => {
    const data = db.prepare('SELECT * FROM schedules ORDER BY updated_at DESC LIMIT 1').get() as any;
    res.json(data ? JSON.parse(data.data) : null);
  });

  app.post('/api/schedule', (req, res) => {
    db.prepare('INSERT INTO schedules (id, data) VALUES (?, ?)').run(
      Date.now().toString(),
      JSON.stringify(req.body)
    );
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
