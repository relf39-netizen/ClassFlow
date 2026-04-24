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

  // --- Database Setup (Non-blocking) ---
  const setupSchema = async () => {
    if (!pool) return;
    try {
      console.log('Attempting to connect to database...');
      await pool.query('SELECT 1');
      console.log('Database connected successfully.');

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
      console.log('Database schema verified.');
    } catch (err) {
      console.error('Database connection/schema error:', err.message);
    }
  };

  setupSchema();

  // --- Middleware ---
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // --- API Routes ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), db: !!pool });
  });

  const entities = ['teachers', 'subjects', 'rooms', 'groups', 'assignments'];
  entities.forEach(entity => {
    const tableName = entity === 'groups' ? 'groups_table' : entity;

    app.get(`/api/${entity}`, async (req, res) => {
      try {
        if (!pool) return res.status(503).json({ error: 'Database not initialized' });
        const [rows] = await pool.query(`SELECT * FROM ${tableName}`);
        res.json(rows);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post(`/api/${entity}`, async (req, res) => {
      try {
        if (!pool) return res.status(503).json({ error: 'Database not initialized' });
        const fields = Object.keys(req.body);
        if (fields.length === 0) return res.status(400).json({ error: 'Empty payload' });
        
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
        if (!pool) return res.status(503).json({ error: 'Database not initialized' });
        await pool.query(`DELETE FROM ${tableName} WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  });

  app.get('/api/settings', async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: 'Database not initialized' });
      const [rows] = await pool.query('SELECT * FROM settings');
      const settings = {};
      rows.forEach((row) => {
        try { settings[row.id] = JSON.parse(row.value); } catch(e) { settings[row.id] = row.value; }
      });
      res.json(settings);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: 'Database not initialized' });
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
      if (!pool) return res.status(503).json({ error: 'Database not initialized' });
      const [rows] = await pool.query('SELECT * FROM schedules ORDER BY updated_at DESC LIMIT 1');
      res.json(rows[0] ? JSON.parse(rows[0].data) : null);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/schedule', async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: 'Database not initialized' });
      await pool.query('INSERT INTO schedules (id, data) VALUES (?, ?)', [Date.now().toString(), JSON.stringify(req.body)]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Static File Serving ---
  const distPath = path.resolve(__dirname, 'dist');
  const indexPath = path.resolve(distPath, 'index.html');
  
  console.log('--- Server Deployment Info ---');
  console.log('CWD:', process.cwd());
  console.log('__dirname:', __dirname);
  console.log('Dist Path:', distPath);
  console.log('Index Path:', indexPath);

  const fs = require('fs');
  if (fs.existsSync(distPath)) {
    console.log('Directory "dist" exists. Files:', fs.readdirSync(distPath));
  } else {
    console.error('CRITICAL: Directory "dist" NOT FOUND!');
  }

  // Handle static assets with explicit serving to ensure correct MIME types and paths
  app.use(express.static(distPath, {
    index: false,
    maxAge: '1h'
  }));

  // API Health Route
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      db: !!pool, 
      distExists: fs.existsSync(distPath),
      indexExists: fs.existsSync(indexPath)
    });
  });

  // Root and SPA Fallback
  app.get('*', (req, res) => {
    // If an asset was requested but missed by express.static, return 404 instead of index.html
    if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf)$/)) {
       console.warn(`[404] Missing asset: ${req.url}`);
       return res.status(404).send('Asset not found');
    }

    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err.message);
          if (!res.headersSent) {
            res.status(500).send('Load Failed');
          }
        }
      });
    } else {
      console.error('CRITICAL: index.html missing at', indexPath);
      res.status(500).send('Application Entry Point (index.html) is missing. Please check the dist folder.');
    }
  });

  app.listen(PORT, () => {
    console.log(`Server listening on PORT: ${PORT}`);
  });
}

// Global Exception Handler
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

