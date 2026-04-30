# 🚀 ChatRoom — Complete Deployment Guide

This guide explicitly details how to deploy all three parts (`server`, `client`, `admin`) to hosting platforms like Vercel and Render, including the exact build commands, root directories, and required environment variables for each module.

---

## 🏗️ Architecture Split

The repository is divided into three distinct applications:

1. `/server`: The Express.js + Node.js backend. Manages the MongoDB database, WebSockets, and JWT authentication.
2. `/client`: The main Vite + React frontend for standard users. (Accessible to the public).
3. `/admin`: The separated Vite + React frontend for the Admin Hub. (Designed to be hosted on a separate domain like `admin.yourdomain.com`).

---

## 💻 Local Development & Setup

### 1. Backend (`/server`)
```bash
cd server
npm install
npm run dev
```

**Required `.env` inside `/server`:**
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/chat
JWT_SECRET=your_super_secret_jwt_string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin_secure_password
# Your deployed client URLs to allow CORS (comma-separated if multiple, or just define one)
CLIENT_URL=http://localhost:5173
```

### 2. Public Client (`/client`)
```bash
cd client
npm install
npm run dev
```

**Required `.env` inside `/client`:**
```env
# Point this to your backend server
VITE_API_URL=http://localhost:5000
```

### 3. Admin Hub (`/admin`)
```bash
cd admin
npm install
npm run dev
```

**Required `.env` inside `/admin`:**
```env
# Point this to your backend server
VITE_API_URL=http://localhost:5000
```

---

## 🚀 Production Deployment Guide (Vercel / Render)

### 1. Deploy the Backend (e.g., Render)
- Connect your GitHub repository to a new Web Service.
- **Root Directory:** `server`
- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Environment Variables:** Add all the `.env` variables listed in the backend section above.

### 2. Deploy the Client (e.g., Vercel)
- Connect your GitHub repository to a new Vercel project.
- **Root Directory:** `client`
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:** Add `VITE_API_URL` pointing to your deployed backend (e.g., `https://chat-backend.onrender.com`).

### 3. Deploy the Admin Hub (e.g., Vercel)
- Connect your GitHub repository to a *second, separate* Vercel project.
- **Root Directory:** `admin`
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:** Add `VITE_API_URL` pointing to your deployed backend.
- **Domain Routing:** Assign a specific subdomain (e.g., `admin.adnanahmad.tech`) to this project in the Vercel dashboard. 
- **Important:** Make sure to add this exact URL (`https://admin.adnanahmad.tech`) to your backend's `server.js` `allowedOrigins` array so CORS permits the connection.
