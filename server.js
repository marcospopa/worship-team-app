const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'mysql',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'Qa123456*',
  database: process.env.MYSQL_DATABASE || 'worship_db'
};

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379'
});
redisClient.connect().catch(console.error);

const JWT_SECRET = process.env.JWT_SECRET || 'your_secure_jwt_secret';

async function initDb() {
  const connection = await mysql.createConnection(mysqlConfig);
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'leader', 'member') DEFAULT 'member'
    )
  `);
  const hashedPassword = await bcrypt.hash('Worship2025!', 10);
  await connection.execute(
    `INSERT IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
    ['admin', hashedPassword, 'admin']
  );
  await connection.end();
}

initDb().catch(console.error);

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Role-based middleware
function restrictTo(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const connection = await mysql.createConnection(mysqlConfig);
  const [rows] = await connection.execute('SELECT * FROM users WHERE username = ?', [username]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Song management
app.get('/api/songs', authenticateToken, async (req, res) => {
  const cacheKey = 'songs';
  const cached = await redisClient.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  const connection = await mysql.createConnection(mysqlConfig);
  const [rows] = await connection.execute('SELECT * FROM songs');
  await redisClient.setEx(cacheKey, 3600, JSON.stringify(rows));
  res.json(rows);
});

app.post('/api/songs', authenticateToken, restrictTo('admin', 'leader'), async (req, res) => {
  const { title, artist, key_signature, lyrics } = req.body;
  const connection = await mysql.createConnection(mysqlConfig);
  await connection.execute(
    'INSERT INTO songs (title, artist, key_signature, lyrics, created_by) VALUES (?, ?, ?, ?, ?)',
    [title, artist, key_signature, lyrics, req.user.id]
  );
  await redisClient.del('songs');
  res.json({ message: 'Song created' });
});

// Setlist management
app.post('/api/setlists', authenticateToken, restrictTo('admin', 'leader'), async (req, res) => {
  const { name, date, songIds } = req.body;
  const connection = await mysql.createConnection(mysqlConfig);
  const [result] = await connection.execute(
    'INSERT INTO setlists (name, date, created_by) VALUES (?, ?, ?)',
    [name, date, req.user.id]
  );
  const setlistId = result.insertId;
  for (const songId of songIds) {
    await connection.execute(
      'INSERT INTO setlist_songs (setlist_id, song_id) VALUES (?, ?)',
      [setlistId, songId]
    );
  }
  res.json({ message: 'Setlist created' });
});

// File upload
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.post('/api/upload', authenticateToken, restrictTo('admin', 'leader'), upload.single('file'), (req, res) => {
  res.json({ filePath: `/uploads/${req.file.filename}` });
});

app.listen(3000, () => console.log('Server running on port 3000'));