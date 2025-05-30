/**
 * Phone Number Encryption Utility
 *
 * Provides secure encryption/decryption of phone numbers for storage
 * in the database. Uses AES-256-CBC encryption with a deterministic
 * approach for rate limiting purposes.
 */

import crypto from "crypto";
import { 
  REGION_DEFINITIONS, 
  detectRegionFromCleanNumber, 
  getRegionByCode,
  type BaseRegion 
} from "./shared-regions";

// Get encryption key from environment variable
const ENCRYPTION_KEY = process.env.PHONE_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.warn(
    "⚠️ PHONE_ENCRYPTION_KEY environment variable not set. Phone encryption disabled."
  );
}

/**
 * Region interface for phone number regions (re-export from shared)
 */
export type PhoneRegion = BaseRegion;

/**
 * Supported regions for phone number detection (re-export from shared)
 */
export const SUPPORTED_PHONE_REGIONS: PhoneRegion[] = REGION_DEFINITIONS;

/**
 * Generate a 32-byte key from the encryption key string
 */
function getEncryptionKey(): Buffer {
  if (!ENCRYPTION_KEY) {
    throw new Error("Encryption key not available");
  }
  // Use PBKDF2 to derive a consistent 32-byte key
  return crypto.pbkdf2Sync(ENCRYPTION_KEY, "phone-salt", 100000, 32, "sha256");
}

/**
 * Normalize a phone number to a consistent format for processing
 * @param phoneNumber - Raw phone number string
 * @returns Normalized phone number in E.164 format
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters except leading +
  const cleaned = phoneNumber.replace(/[^\d+]/g, "");

  // Ensure E.164 format (starts with +)
  if (!cleaned.startsWith("+")) {
    // If it's 10 digits, assume US number
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    // If it's 11 digits and starts with 1, add +
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+${cleaned}`;
    }
    // Default: assume US number
    return `+1${cleaned}`;
  }

  return cleaned;
}

/**
 * Detect the region/country from a phone number
 * @param phoneNumber - Phone number in any format
 * @returns Region object or null if not supported
 */
export function getRegionFromPhoneNumber(phoneNumber: string): PhoneRegion | null {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const cleanNumber = normalizedPhone.replace(/^\+/, ''); // Remove leading +
  
  const regionCode = detectRegionFromCleanNumber(cleanNumber);
  return regionCode ? getRegionByCode(regionCode) : null;
}

/**
 * Get region code from phone number
 * @param phoneNumber - Phone number in any format
 * @returns Region code (US, AU, IN) or null
 */
export function getRegionCodeFromPhoneNumber(phoneNumber: string): string | null {
  const region = getRegionFromPhoneNumber(phoneNumber);
  return region?.code || null;
}

/**
 * Create a deterministic hash of a phone number for rate limiting
 * This creates a consistent hash that can be used for rate limiting
 * without storing the actual phone number
 * @param phoneNumber - Normalized phone number
 * @returns SHA-256 hash of the phone number
 */
export function createPhoneHash(phoneNumber: string): string {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  // Use HMAC with a secret key for better security
  const secret = ENCRYPTION_KEY || "default-secret-key";
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(normalizedPhone);

  return hmac.digest("hex");
}

/**
 * Encrypt a phone number for secure storage
 * @param phoneNumber - Phone number to encrypt
 * @returns Encrypted phone number with IV prepended
 */
export function encryptPhoneNumber(phoneNumber: string): string {
  if (!ENCRYPTION_KEY) {
    // If encryption is disabled, return the phone number as-is (not recommended for production)
    console.warn(
      "⚠️ Phone encryption disabled - storing phone number in plain text"
    );
    return phoneNumber;
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  // Generate a random IV for each encryption
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();

  // Create cipher with AES-256-CBC
  const cipher = crypto.createCipher("aes-256-cbc", key.toString("hex"));

  let encrypted = cipher.update(normalizedPhone, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Combine IV and encrypted data
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt a phone number from secure storage
 * @param encryptedPhoneNumber - Encrypted phone number string
 * @returns Decrypted phone number
 */
export function decryptPhoneNumber(encryptedPhoneNumber: string): string {
  if (!ENCRYPTION_KEY) {
    // If encryption is disabled, return the value as-is
    return encryptedPhoneNumber;
  }

  try {
    // Split the encrypted data
    const parts = encryptedPhoneNumber.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted phone number format");
    }

    const [ivHex, encrypted] = parts;
    const key = getEncryptionKey();

    // Create decipher
    const decipher = crypto.createDecipher("aes-256-cbc", key.toString("hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("❌ Failed to decrypt phone number:", error);
    throw new Error("Failed to decrypt phone number");
  }
}

/**
 * Generate a secure rate limiting key for a phone number
 * This creates a consistent key that can be used for rate limiting
 * without exposing the actual phone number
 * @param phoneNumber - Phone number to create key for
 * @returns Secure rate limiting key
 */
export function createSecurePhoneKey(phoneNumber: string): string {
  const phoneHash = createPhoneHash(phoneNumber);
  return `phone_hash:${phoneHash}`;
}

/**
 * Get both secure key and region for a phone number
 * This is useful for rate limiting with region tracking
 * @param phoneNumber - Phone number to process
 * @returns Object with secure key and region code
 */
export function getPhoneKeyAndRegion(phoneNumber: string): { 
  key: string; 
  region: string | null; 
  normalizedPhone: string;
} {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const region = getRegionCodeFromPhoneNumber(normalizedPhone);
  const key = createSecurePhoneKey(normalizedPhone);
  
  return {
    key,
    region,
    normalizedPhone
  };
}
