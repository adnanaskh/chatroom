# 🚀 ChatRoom — MERN Chat Application

ChatRoom is a secure real-time chat application with advanced user management, AES message encryption, auto-deleting messages, and privacy controls.

Designed, developed and owned by Adnan Ahmad. All copyrights solely belong to Adnan Ahmad. This software and service fall under Indian jurisdiction.

## Features

- ✅ **Instant Real-time Messaging** — Powered by Socket.io for immediate delivery
- ✅ **AES Encrypted Messages** — Messages are encrypted securely before storing in the database
- ✅ **Auto-Delete Messages** — Set customized message timers per conversation
- ✅ **User Privacy & Blocking** — Block unwanted users and delete conversations entirely
- ✅ **Typing Indicators & Online Status** — Real-time presence tracking
- ✅ **Admin Dashboard** — Full user CRUD, activity logs, message statistics
- ✅ **Self-Registration & Terms** — Users can sign up securely with terms acceptance
- ✅ **Comprehensive Activity Logging** — IPs, Browsers, Timings, and Session metadata tracked securely for legal documentation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Express.js + Socket.io |
| Database | MongoDB Atlas |
| Auth | JWT + bcryptjs |

## Local Development

### 1. Setup

```bash
# Server
cd server
cp .env.example .env
npm install
npm run dev

# Client
cd client
cp .env.example .env
npm install
npm run dev
```

### 2. Default Admin Credentials
- **Username:** `admin`
- **Password:** `admin@123`

## Deployment

### Backend
1. Build Command: `npm install`
2. Start Command: `node server.js`
3. Environment variables: `MONGODB_URI`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `CLIENT_URL`, `MESSAGE_ENCRYPTION_KEY`

### Frontend
1. Framework Preset: Vite
2. Environment variable: `VITE_API_URL` (Backend URL)

## Legal

© Designed, developed and owned by Adnan Ahmad. All copyright only he holds. This software and its usage fall under Indian jurisdiction.
