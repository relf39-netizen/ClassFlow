import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Initialize MySQL Connection Pool
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'school_scheduler',
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Database Schema Setup
  const setupSchema = async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id VARCHAR(255) PRIMARY KEY,
          value TEXT
        )
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS teachers (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          color VARCHAR(50)
        )
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS subjects (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50),
          periods_per_week INT DEFAULT 1
        )
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS rooms (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50)
        )
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS groups_table (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        )
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS assignments (
          id VARCHAR(255) PRIMARY KEY,
          group_id VARCHAR(255),
          subject_id VARCHAR(255),
          teacher_id VARCHAR(255),
          room_id VARCHAR(255),
          backup_room_id VARCHAR(255),
          periods_per_week INT,
          FOREIGN KEY(group_id) REFERENCES groups_table(id),
          FOREIGN KEY(subject_id) REFERENCES subjects(id),
          FOREIGN KEY(teacher_id) REFERENCES teachers(id),
          FOREIGN KEY(room_id) REFERENCES rooms(id),
          FOREIGN KEY(backup_room_id) REFERENCES rooms(id)
        )
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS schedules (
          id VARCHAR(255) PRIMARY KEY,
          data LONGTEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Database schema verified');
    } catch (err) {
      console.error('Error creating schema:', err);
    }
  };

  await setupSchema();

  // --- API Routes ---
  
  // Generic CRUD for common entities
  const entities = ['teachers', 'subjects', 'rooms', 'groups', 'assignments'];
  entities.forEach(entity => {
    const tableName = entity === 'groups' ? 'groups_table' : entity;

    app.get(`/api/${entity}`, async (req, res) => {
      try {
        const [rows] = await pool.query(`SELECT * FROM ${tableName}`);
        res.json(rows);
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post(`/api/${entity}`, async (req, res) => {
      const fields = Object.keys(req.body);
      const placeholders = fields.map(() => '?').join(',');
      const values = Object.values(req.body);
      
      // Build ON DUPLICATE KEY UPDATE clause
      const updateClause = fields.map(field => `${field} = VALUES(${field})`).join(',');

      try {
        await pool.query(
          `INSERT INTO ${tableName} (${fields.join(',')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`,
          values
        );
        res.json({ success: true });
      } catch (e: any) {
        console.error(`Error saving to ${entity}:`, e);
        res.status(500).json({ error: e.message });
      }
    });

    app.delete(`/api/${entity}/:id`, async (req, res) => {
      try {
        await pool.query(`DELETE FROM ${tableName} WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    });
  });

  // Settings
  app.get('/api/settings', async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT * FROM settings');
      const settings: Record<string, any> = {};
      rows.forEach((row: any) => settings[row.id] = JSON.parse(row.value));
      res.json(settings);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const { id, value } = req.body;
      const jsonValue = JSON.stringify(value);
      await pool.query(
        'INSERT INTO settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        [id, jsonValue]
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Schedule persistence
  app.get('/api/schedule/latest', async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT * FROM schedules ORDER BY updated_at DESC LIMIT 1');
      const data = rows[0];
      res.json(data ? JSON.parse(data.data) : null);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/schedule', async (req, res) => {
    try {
      await pool.query('INSERT INTO schedules (id, data) VALUES (?, ?)', [
        Date.now().toString(),
        JSON.stringify(req.body)
      ]);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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
