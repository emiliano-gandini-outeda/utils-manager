# Utils Manager

Utils Manager is a self-hosted internal dashboard that centralizes access to internal tools and utilities. It serves as the authentication (SSO) source of truth for the EGO Services ecosystem.

## Features

- **Centralized SSO**: Single login with JWT. All protected services validate the same token.
- **Tool Management**: Register and organize internal tools from a modern web interface.
- **Session Revocation**: Logout invalidates the token across all connected services.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start the server
npm start
```

Open `http://localhost:3000` in your browser.

## Docker

```bash
docker compose up -d --build
```

The app will be available at `http://localhost:3000`.

## Configuration

Edit `.env` to configure:

- `USERS`: Comma-separated `username:bcrypt_hash` pairs
- `JWT_SECRET`: Secret key for JWT signing (must match across all EGO Services)
- `SESSION_SECRET`: Secret for Express session
- `PORT`: Server port (default: 3000)

Generate a bcrypt hash:

```bash
node -e "require('bcryptjs').hash('yourpassword',10).then(console.log)"
```

## Tech Stack

- Node.js + Express (backend)
- SQLite via better-sqlite3 (data store)
- Vanilla JS SPA (frontend)
- No build step required
