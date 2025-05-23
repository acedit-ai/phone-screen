"use client";

import { isValidPhoneNumber as libIsValidPhoneNumber } from 'react-phone-number-input';

/**
 * CLIENT-SIDE phone utilities that use browser-specific libraries
 * These functions should only be used in client components
 */

/**
 * Validates if a phone number is in a valid format (client-side)
 * @param phoneNumber - Phone number to validate (with country code)
 * @returns boolean indicating if valid
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber) return false;
  
  try {
    return libIsValidPhoneNumber(phoneNumber);
  } catch (error) {
    return false;
  }
} 