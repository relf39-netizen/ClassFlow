const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // Initialize MySQL Connection Pool
  let pool;
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'school_scheduler',
      port: parseInt(process.env.DB_PORT || '3306'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000
    });
    console.log('MySQL Pool created');
  } catch (err) {
    console.error('Failed to create MySQL Pool:', err);
  }

  // Database Schema Setup
  const setupSchema = async () => {
    if (!pool) return;
    try {
      await pool.query('SELECT 1');
      console.log('Connected to MySQL successfully');

      await pool.query(`CREATE TABLE IF NOT EXISTS settings (id VARCHAR(255) PRIMARY KEY, value TEXT)`);
      await pool.query(`CREATE TABLE IF NOT EXISTS teachers (id VARCHAR(255) PRIMARY KEY, name VARCHAR(255) NOT NULL, color VARCHAR(50))`);
      await pool.query(`CREATE TABLE IF NOT EXISTS subjects (id VARCHAR(255) PRIMARY KEY, name VARCHAR(255) NOT NULL, type VARCHAR(50), periods_per_week INT DEFAULT 1)`);
      await pool.query(`CREATE TABLE IF NOT EXISTS rooms (id VARCHAR(255) PRIMARY KEY, name VARCHAR(255) NOT NULL, type VARCHAR(50))`);
      await pool.query(`CREATE TABLE IF NOT EXISTS groups_table (id VARCHAR(255) PRIMARY KEY, name VARCHAR(255) NOT NULL)`);
      await pool.query(`CREATE TABLE IF NOT EXISTS assignments (
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
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS schedules (id VARCHAR(255) PRIMARY KEY, data LONGTEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
      console.log('Database schema verified');
    } catch (err) {
      console.error('Database connection or schema error:', err.message);
    }
  };

  // Run schema setup background
  setupSchema();

  // Middleware to log all requests
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API Routes
  const entities = ['teachers', 'subjects', 'rooms', 'groups', 'assignments'];
  entities.forEach(entity => {
    const tableName = entity === 'groups' ? 'groups_table' : entity;

    app.get(`/api/${entity}`, async (req, res) => {
      try {
        if (!pool) throw new Error('Database not connected');
        const [rows] = await pool.query(`SELECT * FROM ${tableName}`);
        res.json(rows);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post(`/api/${entity}`, async (req, res) => {
      try {
        if (!pool) throw new Error('Database not connected');
        const fields = Object.keys(req.body);
        const placeholders = fields.map(() => '?').join(',');
        const values = Object.values(req.body);
        const updateClause = fields.map(field => `\`${field}\` = VALUES(\`${field}\`)`).join(',');
        await pool.query(
          `INSERT INTO ${tableName} (\`${fields.join('`,`')}\`) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`,
          values
        );
        res.json({ success: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.delete(`/api/${entity}/:id`, async (req, res) => {
      try {
        if (!pool) throw new Error('Database not connected');
        await pool.query(`DELETE FROM ${tableName} WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  });

  app.get('/api/settings', async (req, res) => {
    try {
      if (!pool) throw new Error('Database not connected');
      const [rows] = await pool.query('SELECT * FROM settings');
      const settings = {};
      rows.forEach((row) => settings[row.id] = JSON.parse(row.value));
      res.json(settings);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      if (!pool) throw new Error('Database not connected');
      const { id, value } = req.body;
      const jsonValue = JSON.stringify(value);
      await pool.query(
        'INSERT INTO settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        [id, jsonValue]
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/schedule/latest', async (req, res) => {
    try {
      if (!pool) throw new Error('Database not connected');
      const [rows] = await pool.query('SELECT * FROM schedules ORDER BY updated_at DESC LIMIT 1');
      res.json(rows[0] ? JSON.parse(rows[0].data) : null);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/schedule', async (req, res) => {
    try {
      if (!pool) throw new Error('Database not connected');
      await pool.query('INSERT INTO schedules (id, data) VALUES (?, ?)', [Date.now().toString(), JSON.stringify(req.body)]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Static serving
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath, { redirect: false }));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
}

startServer();
