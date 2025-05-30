/**
 * Shared Region Definitions
 * 
 * Single source of truth for all region/country code definitions
 * used across the phone screening application.
 */

export interface BaseRegion {
  code: string;
  name: string;
  flag: string;
  countryCode: string;
  example: string;
}

/**
 * Core region definitions - single source of truth
 */
export const REGION_DEFINITIONS: BaseRegion[] = [
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    countryCode: '+1',
    example: '+1 (555) 123-4567'
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    countryCode: '+61',
    example: '+61 4XX XXX XXX'
  },
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    countryCode: '+91',
    example: '+91 XXXXX XXXXX'
  }
];

/**
 * Phone number detection patterns for each region
 */
export const REGION_DETECTION_PATTERNS = {
  US: {
    pattern: /^1\d{10}$/,
    description: '11 digits starting with 1'
  },
  AU: {
    pattern: /^61\d{8,}$/,
    description: '10+ digits starting with 61'
  },
  IN: {
    pattern: /^91\d{10,}$/,
    description: '12+ digits starting with 91'
  }
} as const;

/**
 * Detect region from a cleaned phone number (digits only, no +)
 * @param cleanNumber - Phone number with only digits, no leading +
 * @returns Region code or null if not supported
 */
export function detectRegionFromCleanNumber(cleanNumber: string): string | null {
  for (const [regionCode, pattern] of Object.entries(REGION_DETECTION_PATTERNS)) {
    if (pattern.pattern.test(cleanNumber)) {
      return regionCode;
    }
  }
  return null;
}

/**
 * Get region object by code
 * @param regionCode - Region code (US, AU, IN)
 * @returns Region object or null if not found
 */
export function getRegionByCode(regionCode: string): BaseRegion | null {
  return REGION_DEFINITIONS.find(r => r.code === regionCode) || null;
}

/**
 * Get all supported region codes
 * @returns Array of region codes
 */
export function getSupportedRegionCodes(): string[] {
  return REGION_DEFINITIONS.map(r => r.code);
}

/**
 * Check if a region code is supported
 * @param regionCode - Region code to check
 * @returns Boolean indicating if region is supported
 */
export function isSupportedRegion(regionCode: string): boolean {
  return REGION_DEFINITIONS.some(r => r.code === regionCode);
} 