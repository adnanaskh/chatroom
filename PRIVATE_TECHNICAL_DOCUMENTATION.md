# 🔐 ChatRoom: Private Technical Documentation
**Author:** Adnan Ahmad  
**Status:** Confidential / Internal Use Only  
**Jurisdiction:** India  
**Last Updated:** 30 April 2026

> [!CAUTION]
> This document contains internal security implementation details. Do not upload this file to public repositories (e.g., GitHub). This file has been added to `.gitignore`.

---

## 1. End-to-End Encryption (E2EE) Architecture
The system utilizes a **Hybrid Cryptosystem** via the browser's native `Web Crypto API` (SubtleCrypto).

### A. Key Management
- **Key Type:** RSA-OAEP (2048-bit modulus, SHA-256 hash).
- **Public Key:** Exported as `spki` and stored in the MongoDB `User` collection. This allows any user to fetch the recipient's key for encryption.
- **Private Key (Cloud Synced):** Exported as `pkcs8` and stored in the user's browser `localStorage` (`chat_keys`). To support multi-device usage (e.g., mobile & desktop simultaneously), the private key is also strictly synced to the MongoDB user record (via an encrypted MongoDB instance). The frontend intelligently resolves conflicts, prioritizing the server's key on new devices.

### B. Encryption Workflow (Sender)
1. **Symmetric Key Generation:** A random 256-bit **AES-GCM** key is generated for every individual message.
2. **Content Encryption:** The message body is encrypted with the AES-GCM key and a random 12-byte IV.
3. **Key Wrapping:** The AES symmetric key is encrypted using the recipient's **RSA Public Key**.
4. **Transmission:** The payload sent to the server includes:
   - `content` (AES-encrypted base64)
   - `iv` (Base64)
   - `encryptedKey` (RSA-wrapped AES key)

### C. Decryption Workflow (Recipient)
1. **Unwrapping:** The recipient uses their **RSA Private Key** to decrypt the `encryptedKey` (unwrapping the AES symmetric key).
2. **Payload Decryption:** The AES key is used to decrypt the `content` blob.

---

## 2. Activity Logging, User Tracking & Legal Compliance
To comply with **Indian Jurisdiction** and potential legal filings, the backend records extensive metadata for every user action.

### A. Data Captured (`ActivityLog` Model)
- **Identity:** `userId`, `username`.
- **Action Types:** `LOGIN`, `REGISTER`, `NAME_CHANGE`, `PASSWORD_CHANGE`, `ACCOUNT_DELETED`, `SESSION_START`, `SESSION_END`.
- **Networking:** 
  - **IP Address:** Captured from `x-forwarded-for` or remote socket address.
  - **Country:** Extracted from Cloudflare/Vercel geolocation headers (`cf-ipcountry`).
- **Device Metadata:** Full `User-Agent` string (Browser version, OS, Device type).
- **Session Tracking:** `sessionId` field for correlating session start/end events.
- **Audit Trail:** Details of specific changes.

---

## 3. Real-Time Delivery & Mobile Optimizations
### A. WebSockets & Background Recovery
- Messages are pushed via Socket.io (`message:new`).
- **Mobile Reconnection:** Mobile browsers severely throttle WebSockets in the background. The app implements a `visibilitychange` listener and a `socket.on('connect')` refetch routine. When the app is pulled from the background or the screen is unlocked, it silently fetches the missed encrypted messages from the server without requiring a manual page refresh.
- **Read Receipts:** Opening a chat or viewing an incoming message automatically triggers a `message:seen` socket event, reflecting instantly as a double-checkmark for the sender.

### B. Progressive Web App (PWA) & Push Notifications
- The app utilizes a `manifest.json` and a Service Worker (`sw.js`) to allow native "Add to Home Screen" installation on iOS and Android.
- When an encrypted message arrives via WebSocket while the app is backgrounded, the Service Worker invokes the native `Notification` API to display a system-level push notification ("New encrypted message").

### C. Form Field Hardening
- Mobile browsers (Safari/Chrome) aggressively auto-fill credit card or location data into chat boxes. This is mitigated by explicitly applying `type="text"`, specific `id`/`name` attributes, and forcing `autoComplete="off"`.

---

## 4. Privacy & Governance Logic
### A. Blocking Mechanism
- **Backend:** A `blockedUsers` array in the User model.
- **Socket Enforcement:** The `server.js` message handler intercepts blocked sockets and drops payloads.

### B. Message Deletion (User-Controlled)
- **Per-Conversation Timer:** Each user sets their own `deleteAfterSeen` TTL via the `ConversationSettings` model.
- **Server Cleanup:** A background `setInterval` runs **every 30 seconds** in `server.js`, scanning the database to execute hard deletions of messages that have exceeded their seen TTL limit.

---

## 5. Administrative Split-Domain Architecture
To maximize security and reduce client bundle weight, the administrative interface has been completely physically separated from the main chat application.

- **Client App (`/client`):** Contains zero administrative code. The word "admin" is non-existent in the router.
- **Admin Hub App (`/admin`):** A standalone Vite React application hosting `AdminHub`, `ChatAdminLogin`, and `ChatAdminDashboard`. 
- **Domain Enforcement:** The Admin app is designed to be hosted on a separate Vercel/Render project bound exclusively to a protected subdomain (e.g., `admin.adnanahmad.tech`).
- **Danger Zone Functions:** The admin interface features global execution endpoints (`/api/auth/users/all` and `/api/auth/activity/all`) to wipe all standard users, tracking arrays, and logs instantly.

---

## 6. Design System
- **Font Stack:** DM Sans (UI), JetBrains Mono (monospace data like IPs).
- **Color Palette:** Neutral dark theme (`#0c0c0c` base, `#141414` secondary). Accent: `#6366f1` (Indigo).
- **Design Philosophy:** Flat, minimal, highly responsive. 

---
© Adnan Ahmad. All rights reserved.
Legal Jurisdiction: Republic of India.
