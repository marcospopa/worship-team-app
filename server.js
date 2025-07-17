const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(express.json());

// Serve React build from client/dist
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// API routes
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

app.put('/api/songs/:id', authenticateToken, restrictTo('admin', 'leader'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist, key_signature, lyrics } = req.body;
    const connection = await mysql.createConnection(mysqlConfig);
    await connection.execute(
      'UPDATE songs SET title = ?, artist = ?, key_signature = ?, lyrics = ? WHERE id = ?',
      [title, artist, key_signature, lyrics, id]
    );
    await connection.end();
    await redisClient.del('songs');
    res.json({ message: 'Song updated successfully' });
  } catch (error) {
    console.error('Error updating song:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/songs/:id', authenticateToken, restrictTo('admin', 'leader'), async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(mysqlConfig);
    await connection.execute('DELETE FROM setlist_songs WHERE song_id = ?', [id]);
    await connection.execute('DELETE FROM songs WHERE id = ?', [id]);
    await connection.end();
    await redisClient.del('songs');
    res.json({ message: 'Song deleted successfully' });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
  await redisClient.del('setlists');
  res.json({ message: 'Setlist created' });
});

app.get('/api/setlists', authenticateToken, async (req, res) => {
  try {
    const cacheKey = 'setlists';
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
    const connection = await mysql.createConnection(mysqlConfig);
    const [rows] = await connection.execute(`
      SELECT s.*, u.username as created_by_username 
      FROM setlists s 
      JOIN users u ON s.created_by = u.id 
      ORDER BY s.date DESC
    `);
    await connection.end();
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(rows));
    res.json(rows);
  } catch (error) {
    console.error('Error fetching setlists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/setlists/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(mysqlConfig);
    const [setlistRows] = await connection.execute(`
      SELECT s.*, u.username as created_by_username 
      FROM setlists s 
      JOIN users u ON s.created_by = u.id 
      WHERE s.id = ?
    `, [id]);
    if (setlistRows.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Setlist not found' });
    }
    const [songsRows] = await connection.execute(`
      SELECT s.* 
      FROM songs s 
      JOIN setlist_songs ss ON s.id = ss.song_id 
      WHERE ss.setlist_id = ?
      ORDER BY ss.song_id
    `, [id]);
    await connection.end();
    const setlist = setlistRows[0];
    setlist.songs = songsRows;
    res.json(setlist);
  } catch (error) {
    console.error('Error fetching setlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/setlists/:id', authenticateToken, restrictTo('admin', 'leader'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, songIds } = req.body;
    const connection = await mysql.createConnection(mysqlConfig);
    await connection.execute(
      'UPDATE setlists SET name = ?, date = ? WHERE id = ?',
      [name, date, id]
    );
    if (songIds && Array.isArray(songIds)) {
      await connection.execute('DELETE FROM setlist_songs WHERE setlist_id = ?', [id]);
      for (const songId of songIds) {
        await connection.execute(
          'INSERT INTO setlist_songs (setlist_id, song_id) VALUES (?, ?)',
          [id, songId]
        );
      }
    }
    await connection.end();
    await redisClient.del('setlists');
    res.json({ message: 'Setlist updated successfully' });
  } catch (error) {
    console.error('Error updating setlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/setlists/:id', authenticateToken, restrictTo('admin', 'leader'), async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(mysqlConfig);
    await connection.execute('DELETE FROM setlist_songs WHERE setlist_id = ?', [id]);
    await connection.execute('DELETE FROM setlists WHERE id = ?', [id]);
    await connection.end();
    await redisClient.del('setlists');
    res.json({ message: 'Setlist deleted successfully' });
  } catch (error) {
    console.error('Error deleting setlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User management
app.get('/api/users', authenticateToken, restrictTo('admin'), async (req, res) => {
  try {
    const connection = await mysql.createConnection(mysqlConfig);
    const [rows] = await connection.execute('SELECT id, username, role FROM users');
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', authenticateToken, restrictTo('admin'), async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const connection = await mysql.createConnection(mysqlConfig);
    await connection.execute(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );
    await connection.end();
    res.json({ message: 'User created successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:id', authenticateToken, restrictTo('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role, password } = req.body;
    const connection = await mysql.createConnection(mysqlConfig);
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await connection.execute(
        'UPDATE users SET username = ?, role = ?, password = ? WHERE id = ?',
        [username, role, hashedPassword, id]
      );
    } else {
      await connection.execute(
        'UPDATE users SET username = ?, role = ? WHERE id = ?',
        [username, role, id]
      );
    }
    await connection.end();
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/users/:id', authenticateToken, restrictTo('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const connection = await mysql.createConnection(mysqlConfig);
    await connection.execute('DELETE FROM users WHERE id = ?', [id]);
    await connection.end();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(mysqlConfig);
    const [rows] = await connection.execute(
      'SELECT id, username, role FROM users WHERE id = ?', 
      [req.user.id]
    );
    await connection.end();
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

app.listen(3000, () => console.log('Server running on port 3000'));