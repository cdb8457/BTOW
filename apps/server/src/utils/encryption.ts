import crypto from 'crypto';

/**
 * Encryption Configuration
 * 
 * Uses AES-256-GCM for authenticated encryption.
 * The encryption key should be set via ENCRYPTION_KEY environment variable.
 * 
 * Key requirements:
 * - Must be exactly 32 bytes (256 bits)
 * - Should be generated using: openssl rand -hex 32
 * - Store securely - losing the key means losing all encrypted data
 */

// Get encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Initialization vector length
const AUTH_TAG_LENGTH = 16; // GCM authentication tag length
const SALT_LENGTH = 32; // Salt for key derivation

/**
 * Validates that an encryption key is available
 * @throws Error if no encryption key is configured
 */
export function validateEncryptionKey(): void {
  if (!ENCRYPTION_KEY) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. ' +
      'Generate one with: openssl rand -hex 32'
    );
  }
  
  if (ENCRYPTION_KEY.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). ' +
      'Generate one with: openssl rand -hex 32'
    );
  }
}

/**
 * Derives a key from the master key using a salt
 * This provides forward secrecy for individual messages
 */
function deriveKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    ENCRYPTION_KEY!,
    salt,
    100000, // Iterations
    32, // Key length
    'sha256'
  );
}

/**
 * Encrypted data structure (stored in database)
 */
export interface EncryptedPayload {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded
  authTag: string; // Base64 encoded
  salt: string; // Base64 encoded
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 * 
 * @param plaintext - The text to encrypt
 * @returns JSON string containing encrypted payload
 */
export function encrypt(plaintext: string): string {
  validateEncryptionKey();
  
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Derive key for this encryption
  const key = deriveKey(salt);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  
  // Get authentication tag
  const authTag = cipher.getAuthTag();
  
  // Create payload
  const payload: EncryptedPayload = {
    ciphertext,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    salt: salt.toString('base64'),
  };
  
  return JSON.stringify(payload);
}

/**
 * Decrypts an encrypted payload using AES-256-GCM
 * 
 * @param encryptedData - JSON string containing encrypted payload
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (tampered data or wrong key)
 */
export function decrypt(encryptedData: string): string {
  validateEncryptionKey();
  
  try {
    const payload: EncryptedPayload = JSON.parse(encryptedData);
    
    // Decode components
    const salt = Buffer.from(payload.salt, 'base64');
    const iv = Buffer.from(payload.iv, 'base64');
    const authTag = Buffer.from(payload.authTag, 'base64');
    
    // Derive key
    const key = deriveKey(salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let plaintext = decipher.update(payload.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  } catch (error) {
    // Check if this might be plaintext (unencrypted) data
    // For backwards compatibility during migration
    if (isLikelyPlaintext(encryptedData)) {
      return encryptedData;
    }
    
    throw new Error('Failed to decrypt message: Data may be corrupted or tampered with');
  }
}

/**
 * Checks if data appears to be plaintext (not encrypted)
 * Used for backwards compatibility during migration
 */
export function isLikelyPlaintext(data: string): boolean {
  // Encrypted data should be JSON with specific fields
  try {
    const parsed = JSON.parse(data);
    return !(
      parsed.ciphertext &&
      parsed.iv &&
      parsed.authTag &&
      parsed.salt
    );
  } catch {
    // If it's not valid JSON, it's plaintext
    return true;
  }
}

/**
 * Encrypts message content
 * Alias for encrypt() with semantic naming
 */
export function encryptMessage(content: string): string {
  return encrypt(content);
}

/**
 * Decrypts message content
 * Handles both encrypted and plaintext (for migration)
 */
export function decryptMessage(content: string): string {
  return decrypt(content);
}

/**
 * Batch encrypt multiple messages (for migration)
 */
export function encryptBatch(messages: string[]): string[] {
  return messages.map(msg => encrypt(msg));
}

/**
 * Batch decrypt multiple messages
 */
export function decryptBatch(messages: string[]): string[] {
  return messages.map(msg => decrypt(msg));
}

/**
 * Generates a new encryption key
 * Run this once and store in .env
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verifies if a string is a valid encryption key format
 */
export function isValidEncryptionKey(key: string): boolean {
  return /^[0-9a-f]{64}$/i.test(key);
}

// Export for testing
export const _internal = {
  ALGORITHM,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
  SALT_LENGTH,
};
