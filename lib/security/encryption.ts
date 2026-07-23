import crypto from "crypto";

const SECRET_KEY = process.env.NEXTAUTH_SECRET || "loop_default_secret_key_32_bytes_long!!";

// Derive 32-byte key for AES-256
function getDerivedKey(): Buffer {
  return crypto.createHash("sha256").update(SECRET_KEY).digest();
}

/**
 * Encrypt sensitive configuration text using AES-256-GCM
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return "";
  try {
    const key = getDerivedKey();
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    
    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error("[Security] Encryption failed:", error);
    throw new Error("Failed to encrypt sensitive credential.");
  }
}

/**
 * Decrypt AES-256-GCM encrypted string
 */
export function decryptSecret(cipherText: string): string {
  if (!cipherText) return "";
  if (!cipherText.includes(":")) return cipherText; // Return plain string if not encrypted
  try {
    const parts = cipherText.split(":");
    if (parts.length !== 3) return cipherText;
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getDerivedKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("[Security] Decryption failed:", error);
    return cipherText; // Fallback to raw text if decryption fails
  }
}

/**
 * Mask sensitive credentials for safe UI/API responses (e.g. whsec_••••••••4a2b)
 */
export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 8) return "••••••••";
  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Generate HMAC-SHA256 signature for outgoing webhook payload
 * Format: t=<timestamp>,v1=<hmac_hash>
 */
export function generateHmacSignature(
  secret: string,
  payload: string,
  timestamp: number = Math.floor(Date.now() / 1000)
): { timestamp: number; signature: string; header: string } {
  const normalizedSecret = secret || SECRET_KEY;
  const signaturePayload = `${timestamp}.${payload}`;
  const hmac = crypto.createHmac("sha256", normalizedSecret).update(signaturePayload).digest("hex");
  const header = `t=${timestamp},v1=${hmac}`;
  
  return {
    timestamp,
    signature: hmac,
    header,
  };
}
