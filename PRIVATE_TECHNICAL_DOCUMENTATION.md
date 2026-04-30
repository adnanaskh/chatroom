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
- **Private Key:** Exported as `pkcs8` and stored **only** in the user's browser `localStorage` (`chat_keys`). It is never transmitted to the server.

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
- **Audit Trail:** Details of specific changes (e.g., "Changed display name from A to B").

### B. Admin Tracking Dashboard
The Admin Panel features a dedicated **Tracking** tab that provides:
- **Summary Statistics:** Total activity logs, today's logins, weekly login count, unique IP addresses.
- **Full Activity Log Table:** Chronological list of all user actions with IP, browser, country, and details columns.
- **Action Filters:** Filter logs by action type (LOGIN, REGISTER, NAME_CHANGE, PASSWORD_CHANGE, ACCOUNT_DELETED).
- **Per-User Activity Viewer:** Modal accessible from the Users tab to inspect a specific user's complete audit trail.

### C. API Endpoints for Tracking
- `GET /api/auth/activity/all` — Paginated list of all activity logs (admin only). Supports `?action=` filter and `?page=`/`?limit=` pagination.
- `GET /api/auth/tracking/summary` — Aggregated tracking stats: total logs, today/weekly logins, unique IP count, recent sessions (admin only).
- `GET /api/auth/users/:id/activity` — Activity logs for a specific user (admin only).

---

## 3. Privacy & Governance Logic
### A. Blocking Mechanism
- **Backend:** A `blockedUsers` array in the User model.
- **Socket Enforcement:** The `server.js` message handler performs a DB lookup on the receiver before processing. If the sender's ID is in the receiver's `blockedUsers` list, the message is dropped and an error is emitted.
- **UI:** The input field is conditionally rendered based on the block status.

### B. Message Deletion (User-Controlled)
- **Per-Conversation Timer:** Each user can set their own `deleteAfterSeen` timer (1 minute to 30 days) via the `ConversationSettings` model. This controls when messages are automatically deleted after being seen.
- **No Admin Override:** The admin panel does **not** have a global message TTL control. Message retention is entirely user-controlled per conversation.
- **Server Cleanup:** A background `setInterval` (hourly) scans `ConversationSettings` and deletes messages that have been seen beyond the configured `deleteAfterSeen` threshold.
- **Manual Deletion:** Users can delete entire conversations manually. Admin can clear all messages via the Danger Zone.

### C. Soft Deletion & Account Lifecycle
- **Account Deletion:** When a user deletes their account, the record is flagged as `isDeleted: true`. Their profile name is changed to `[Deleted User]`, and their avatar is cleared, but the **Activity Logs remain** for historical compliance.
- **All messages** sent/received by the deleted user are permanently removed from the database.

---

## 4. Administrative Security
- **Static Authentication:** Admin access is governed by `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables, bypassing the MongoDB user database to prevent lockout during DB failures.
- **JWT Protection:** All sensitive routes require a Bearer token with `isAdmin: true` payload.
- **Admin Dashboard Tabs:**
  - **Users:** Create, ban/unban, reset passwords, delete users, view per-user activity.
  - **Messages:** View message stats (total, today), clear all messages (danger zone).
  - **Tracking:** Full user tracking with IP, session, browser, and country data.

---

## 5. Mobile & UX Hardening
- **Back Button Protection:** The chat page uses `history.pushState` + `popstate` event listeners to intercept the browser/hardware back button on mobile devices. Pressing back navigates from chat view to sidebar (conversation list) instead of logging the user out.
- **Keyboard Handling:** The `Backspace` key is intercepted on non-input elements to prevent accidental browser back navigation.
- **Responsive Layout:** CSS uses `100dvh` for proper mobile viewport handling. The sidebar and chat area toggle visibility on screens ≤768px.

---

## 6. Deployment Constants
- **Database:** MongoDB Atlas (Production).
- **Socket Protocol:** WebSockets (WSS) for encrypted transmission.
- **Encryption Seed:** While the server no longer handles E2EE, it maintains a fallback `JWT_SECRET` for session management.
- **Frontend:** Vite + React, deployed on Vercel.
- **Backend:** Express + Socket.IO, deployed on Render.

---

## 7. Design System
- **Font Stack:** DM Sans (UI), JetBrains Mono (monospace data like IPs).
- **Color Palette:** Neutral dark theme (`#0c0c0c` base, `#141414` secondary, `#1c1c1c` tertiary). Accent: `#6366f1` (Indigo). Borders: `rgba(255,255,255,0.06)`.
- **Design Philosophy:** Flat, minimal, no gradients or glowing effects. Professional and restrained.

---
© Adnan Ahmad. All rights reserved.
Legal Jurisdiction: Republic of India.
