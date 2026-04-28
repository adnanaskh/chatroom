# 🚀 ChatRoom — MERN Chat Application

Secure real-time chat with admin-only user management and auto-deleting messages.

## Features

- ✅ **Admin-Only Signup** — Only admin can create user accounts
- ✅ **Static Admin Login** — Hardcoded credentials via environment variables
- ✅ **Real-time Messaging** — Socket.io powered instant chat
- ✅ **Auto-Delete Messages** — MongoDB TTL index (default: 1 day, configurable)
- ✅ **Typing Indicators** — See who's typing in real-time
- ✅ **Online Users** — Live user presence tracking
- ✅ **Admin Dashboard** — User CRUD, message stats, settings

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Express.js + Socket.io |
| Database | MongoDB Atlas |
| Auth | JWT + bcryptjs |
| Deployment | Vercel (frontend) + Render (backend) |

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)

### 1. Clone & Setup

```bash
# Server
cd server
cp .env.example .env
# Edit .env with your MongoDB URI and credentials
npm install
npm run dev

# Client (new terminal)
cd client
cp .env.example .env
npm install
npm run dev
```

### 2. Default Admin Credentials
- **Username:** `admin`
- **Password:** `admin@123`

(Change these in `server/.env`)

## Deployment

### Backend → Render

1. Create a **Web Service** on [Render](https://render.com)
2. Connect your repo, set **Root Directory** to `server`
3. **Build Command:** `npm install`
4. **Start Command:** `node server.js`
5. Add environment variables:
   - `MONGODB_URI` — Your Atlas connection string
   - `JWT_SECRET` — Strong random string
   - `ADMIN_USERNAME` — Your admin username
   - `ADMIN_PASSWORD` — Your admin password
   - `CLIENT_URL` — Your Vercel frontend URL
   - `MESSAGE_TTL` — Message retention in seconds (86400 = 1 day)

### Frontend → Vercel

1. Import project on [Vercel](https://vercel.com)
2. Set **Root Directory** to `client`
3. **Framework Preset:** Vite
4. Add environment variable:
   - `VITE_API_URL` — Your Render backend URL (e.g., `https://chat-api.onrender.com`)

## Routes

| Path | Description |
|------|-------------|
| `/` | User login |
| `/chat` | Chat room (authenticated users) |
| `/admin` | Admin login |
| `/admin/dashboard` | Admin panel (user management, settings) |

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/admin/login` | None | Admin login (static creds) |
| POST | `/api/auth/login` | None | User login |
| POST | `/api/auth/users` | Admin | Create user |
| GET | `/api/auth/users` | Admin | List all users |
| DELETE | `/api/auth/users/:id` | Admin | Delete user |
| PATCH | `/api/auth/users/:id/password` | Admin | Reset password |
| GET | `/api/messages` | User | Get messages (paginated) |
| GET | `/api/messages/stats` | Admin | Message statistics |
| GET | `/api/settings` | Admin | Get settings |
| PUT | `/api/settings/ttl` | Admin | Update message TTL |
| DELETE | `/api/settings/messages` | Admin | Clear all messages |
