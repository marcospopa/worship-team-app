CREATE DATABASE IF NOT EXISTS worship_db;
USE worship_db;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'leader', 'member') NOT NULL
);

CREATE TABLE songs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  artist VARCHAR(100),
  key_signature VARCHAR(10),
  lyrics TEXT,
  created_by INT,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE setlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  date DATE,
  created_by INT,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE setlist_songs (
  setlist_id INT,
  song_id INT,
  FOREIGN KEY (setlist_id) REFERENCES setlists(id),
  FOREIGN KEY (song_id) REFERENCES songs(id),
  PRIMARY KEY (setlist_id, song_id)
);

INSERT IGNORE INTO users (username, password, role)
VALUES ('admin', '$2b$10$5Qz3Xz4z7Z8X9Y0W1V2U3u4V5W6X7Y8Z9A0B1C2D3E4F5G6H7I8J9', 'admin');