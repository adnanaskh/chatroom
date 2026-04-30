# 🔐 ChatRoom: Private Technical Documentation
**Author:** Adnan Ahmad  
**Status:** Confidential / Internal Use Only  
**Jurisdiction:** India

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

## 2. Activity Logging & Legal Compliance
To comply with **Indian Jurisdiction** and potential legal filings, the backend records extensive metadata for every user action.

### A. Data Captured (`ActivityLog` Model)
- **Identity:** `userId`, `username`.
- **Action Types:** `LOGIN`, `REGISTER`, `NAME_CHANGE`, `PASSWORD_CHANGE`, `ACCOUNT_DELETED`.
- **Networking:** 
  - **IP Address:** Captured from `x-forwarded-for` or remote socket address.
  - **Country:** Extracted from Cloudflare/Vercel geolocation headers (`cf-ipcountry`).
- **Device Metadata:** Full `User-Agent` string (Browser version, OS, Device type).
- **Audit Trail:** Details of specific changes (e.g., "Changed display name from A to B").

### B. Admin Visibility
The Admin Panel features a dedicated **Activity Viewer** (Modal) that displays the chronological audit trail for any user. This is designed to serve as admissible evidence if required by authorities.

---

## 3. Privacy & Governance Logic
### A. Blocking Mechanism
- **Backend:** A `blockedUsers` array in the User model.
- **Socket Enforcement:** The `server.js` message handler performs a DB lookup on the receiver before processing. If the sender's ID is in the receiver's `blockedUsers` list, the message is dropped and an error is emitted.
- **UI:** The input field is conditionally rendered based on the block status.

### B. Soft Deletion & TTL
- **Account Deletion:** When a user deletes their account, the record is flagged as `isDeleted: true`. Their profile name is changed to `[Deleted User]`, and their avatar is cleared, but the **Activity Logs remain** for historical compliance.
- **Message Auto-Delete (TTL):** MongoDB `expireAfterSeconds` index is set on the `createdAt` field of the `chatmeesage` collection. The default is 24 hours but is configurable via the Admin Settings.

---

## 4. Administrative Security
- **Static Authentication:** Admin access is governed by `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables, bypassing the MongoDB user database to prevent lockout during DB failures.
- **JWT Protection:** All sensitive routes require a Bearer token with `isAdmin: true` payload.

---

## 5. Deployment Constants
- **Database:** MongoDB Atlas (Production).
- **Socket Protocol:** WebSockets (WSS) for encrypted transmission.
- **Encryption Seed:** While the server no longer handles E2EE, it maintains a fallback `JWT_SECRET` for session management.

---
© Adnan Ahmad. All rights reserved.
Legal Jurisdiction: Republic of India.
