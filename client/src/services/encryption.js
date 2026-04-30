/**
 * End-to-End Encryption Service using Web Crypto API
 */

// Helper to convert Buffer to Base64
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to Buffer
function base64ToArrayBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export const encryption = {
  // Generate a new RSA-OAEP key pair
  async generateKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    return {
      publicKey: arrayBufferToBase64(publicKey),
      privateKey: arrayBufferToBase64(privateKey),
    };
  },

  // Encrypt a message for a recipient and the sender using their respective public keys
  async encryptMessage(plainText, recipientPublicKeyBase64, senderPublicKeyBase64) {
    // 1. Import recipient's public key
    const publicKeyBuffer = base64ToArrayBuffer(recipientPublicKeyBase64);
    const publicKey = await window.crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );

    // 2. Generate a random symmetric key (AES-GCM)
    const aesKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    // 3. Encrypt the message with AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      encoder.encode(plainText)
    );

    // 4. Encrypt the AES key with the recipient's RSA Public Key
    const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
    const encryptedAesKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      exportedAesKey
    );

    // 5. Encrypt the AES key with the sender's RSA Public Key
    const senderPublicKeyBuffer = base64ToArrayBuffer(senderPublicKeyBase64);
    const senderPublicKey = await window.crypto.subtle.importKey(
      "spki",
      senderPublicKeyBuffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );
    const senderEncryptedAesKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      senderPublicKey,
      exportedAesKey
    );

    return {
      content: arrayBufferToBase64(encryptedContent),
      iv: arrayBufferToBase64(iv),
      encryptedKey: arrayBufferToBase64(encryptedAesKey),
      senderEncryptedKey: arrayBufferToBase64(senderEncryptedAesKey)
    };
  },

  // Decrypt a message using your private key
  async decryptMessage(encryptedData, privateKeyBase64) {
    try {
      const { content, iv, encryptedKey } = encryptedData;
      if (!content || !iv || !encryptedKey) return "[Incompatible Message Format]";

      // 1. Import your private key
      const privateKeyBuffer = base64ToArrayBuffer(privateKeyBase64);
      const privateKey = await window.crypto.subtle.importKey(
        "pkcs8",
        privateKeyBuffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["decrypt"]
      );

      // 2. Decrypt the AES key using your RSA Private Key
      const decryptedAesKeyBuffer = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        base64ToArrayBuffer(encryptedKey)
      );

      const aesKey = await window.crypto.subtle.importKey(
        "raw",
        decryptedAesKeyBuffer,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );

      // 3. Decrypt the content using the AES key
      const decryptedContent = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToArrayBuffer(iv) },
        aesKey,
        base64ToArrayBuffer(content)
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedContent);
    } catch (error) {
      console.error("Decryption failed:", error);
      return "[Decryption Failed - Key Mismatch]";
    }
  }
};
