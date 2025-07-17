Church Worship Team Management App
A web application to manage a church worship team's music and song repertoire. Built with a modern tech stack, it supports user authentication, role-based access (Admin, Leader, Member), song management, setlist creation, and file uploads for sheet music. The app uses Node.js/Express for the backend, React/Tailwind CSS for the frontend, MySQL for the database, and Redis for caching.
Features

Authentication: Login with username/password (default admin: admin / Worship2025!).
Roles: Admin (full access), Leader (manage songs/setlists), Member (view-only).
Song Management: Add, edit, delete songs with details (title, artist, key, lyrics).
Setlist Management: Create and manage worship setlists.
File Uploads: Upload sheet music or chord charts.
Caching: Redis caches song data for improved performance.
Responsive UI: Fresh login page with clear green (#4CAF50) and light blue (#4FC3F7) colors.

Tech Stack

Backend: Node.js, Express.js
Frontend: React, Tailwind CSS, Axios
Database: MySQL
Cache: Redis
Containerization: Docker, Docker Compose
Security: bcrypt for password hashing, JWT for authentication

Prerequisites

Docker and Docker Compose
Node.js (optional, for local development without Docker)
Git to clone the repository

Project Structure
worship-app/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── schema.sql
├── server.js
├── index.html
└── public/
    └── uploads/

Setup Instructions
Using Docker (Recommended)

Clone the Repository:
git clone https://github.com/your-username/worship-app.git
cd worship-app


Create the Uploads Directory:
mkdir -p public/uploads


Update Environment Variables:

Open docker-compose.yml and replace your_password and secret_key with secure values.
Optionally, create a .env file for sensitive data:MYSQL_ROOT_PASSWORD=your_secure_password
JWT_SECRET=your_secure_jwt_secret




Run the Application:
docker-compose up --build


The app will be available at http://localhost:3000.


Access the App:

Open http://localhost:3000 in a browser.
Log in with:
Username: admin
Password: Worship2025!





Local Development (Without Docker)

Install Dependencies:
npm install


Set Up MySQL:

Install MySQL locally.
Create a database named worship_db.
Run the SQL commands in schema.sql to create tables and the default admin user.


Set Up Redis:

Install and run Redis locally (default port: 6379).


Configure Environment Variables:

Create a .env file in the project root:MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=worship_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secure_jwt_secret




Start the Server:
node server.js


Access the App:

Open http://localhost:3000 and log in with the default admin credentials.



Usage

Login: Use the default admin credentials or create new users (Admin role required).
Song Management: Admins and Leaders can add/edit/delete songs via API endpoints.
Setlist Management: Admins and Leaders can create setlists and assign songs.
File Uploads: Upload sheet music or chord charts (stored in public/uploads).
Roles:
Admin: Full access to all features.
Leader: Manage songs and setlists.
Member: View songs and setlists.



API Endpoints

POST /api/auth/login: Authenticate and receive a JWT token.
GET /api/songs: Retrieve all songs (cached in Redis).
POST /api/songs: Create a new song (Admin/Leader only).
POST /api/upload: Upload a file (Admin/Leader only).
POST /api/setlists: Create a setlist with associated songs (Admin/Leader only).

Security Notes

Replace your_password and secret_key in docker-compose.yml with secure values.
Use environment variables (e.g., .env file) for sensitive data in production.
The default admin password (Worship2025!) should be changed after initial login.
For production, consider using a cloud storage service (e.g., AWS S3) instead of local file storage for uploads.

Extending the App

Frontend: Add React components for dashboard, song management, and setlist views in index.html.
Backend: Add API routes for additional features like song search or user management.
Database: Extend the schema to support additional fields (e.g., song tempo, category).

Troubleshooting

MySQL Connection Issues: Ensure the MySQL service is running and credentials match docker-compose.yml or .env.
Redis Errors: Verify Redis is running on port 6379.
File Uploads: Ensure the public/uploads directory exists and is writable.
Typo in server.js: If you encounter an error in the /api/auth/login route, manually replace rows[фаq0] with rows[0] in server.js.
