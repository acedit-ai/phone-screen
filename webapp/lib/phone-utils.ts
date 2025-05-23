/**
 * SERVER-SIDE phone utilities that work in Node.js environment
 * These functions don't depend on browser-specific libraries
 */

/**
 * Formats a phone number to E.164 format for Twilio (server-side)
 * @param phoneNumber - Phone number input (should already be in E.164 format from client)
 * @returns Formatted phone number in E.164 format
 */
export function formatPhoneNumberForTwilio(phoneNumber: string): string {
  // If it already starts with +, assume it's properly formatted from client
  if (phoneNumber.startsWith("+")) {
    return phoneNumber;
  }

  // Fallback for legacy US number handling
  const digits = phoneNumber.replace(/\D/g, "");

  // If it's 10 digits, assume US number and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it's 11 digits and starts with 1, add +
  if (digits.length === 11 && digits[0] === "1") {
    return `+${digits}`;
  }

  // Default: assume US number
  return `+1${digits}`;
}

/**
 * Basic server-side phone number validation
 * @param phoneNumber - Phone number to validate
 * @returns boolean indicating if valid
 */
export function isValidPhoneNumberServer(phoneNumber: string): boolean {
  if (!phoneNumber) return false;
  
  // Basic E.164 format validation
  const e164Pattern = /^\+[1-9]\d{1,14}$/;
  return e164Pattern.test(phoneNumber);
}
