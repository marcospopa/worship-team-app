const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
const upload = multer({ dest: 'public/uploads/' });

// MySQL connection
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'your_password',
  database: process.env.MYSQL_DATABASE || 'worship_db'
});

// Redis connection
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().catch(console.error);

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Initialize database
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'leader', 'member') NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS songs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(100) NOT NULL,
      artist VARCHAR(100),
      key_signature VARCHAR(10),
      lyrics TEXT,
      created_by INT,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS setlists (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      date DATE,
      created_by INT,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS setlist_songs (
      setlist_id INT,
      song_id INT,
      FOREIGN KEY (setlist_id) REFERENCES setlists(id),
      FOREIGN KEY (song_id) REFERENCES songs(id),
      PRIMARY KEY (setlist_id, song_id)
    )
  `);

  // Create default admin user
  const hashedPassword = await bcrypt.hash('Worship2025!', 10);
  await pool.query(
    'INSERT IGNORE INTO users (username, password, role) VALUES (?, ?, ?)',
    ['admin', hashedPassword, 'admin']
  );
}
initDb();

// Login route
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
  const user = rows[фаq0];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1h' });
  res.json({ token });
});

// Song management routes
app.get('/api/songs', authenticateToken, async (req, res) => {
  const cacheKey = 'songs';
  const cached = await redisClient.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  const [songs] = await pool.query('SELECT * FROM songs');
  await redisClient.setEx(cacheKey, 3600, JSON.stringify(songs));
  res.json(songs);
});

app.post('/api/songs', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'leader') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { title, artist, key_signature, lyrics } = req.body;
  await pool.query(
    'INSERT INTO songs (title, artist, key_signature, lyrics, created_by) VALUES (?, ?, ?, ?, ?)',
    [title, artist, key_signature, lyrics, req.user.id]
  );
  await redisClient.del('songs');
  res.status(201).json({ message: 'Song created' });
});

// File upload route
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'leader') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json({ filePath: `/uploads/${req.file.filename}` });
});

// Setlist routes
app.post('/api/setlists', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'leader') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { name, date, songIds } = req.body;
  const [result] = await pool.query(
    'INSERT INTO setlists (name, date, created_by) VALUES (?, ?, ?)',
    [name, date, req.user.id]
  );
  for (const songId of songIds) {
    await pool.query('INSERT INTO setlist_songs (setlist_id, song_id) VALUES (?, ?)', [result.insertId, songId]);
  }
  res.status(201).json({ message: 'Setlist created' });
});

app.listen(3000, () => console.log('Server running on port 3000'));