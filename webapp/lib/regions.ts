import { Country } from "react-phone-number-input";

export interface Region {
  code: string;
  name: string;
  flag: string;
  countryCode: string;
  phoneNumber?: string; // Optional on client-side
  example: string;
}

export const SUPPORTED_REGIONS: Region[] = [
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

export const SUPPORTED_COUNTRIES: Country[] = SUPPORTED_REGIONS.map(r => r.code as Country);

export const REGION_INFO = SUPPORTED_REGIONS.reduce((acc, region) => {
  acc[region.code as keyof typeof acc] = {
    name: region.name,
    flag: region.flag,
    example: region.example
  };
  return acc;
}, {} as Record<string, { name: string; flag: string; example: string }>);

export function getRegionFromPhoneNumber(phoneNumber: string): Region | null {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  if (cleanNumber.startsWith('1') && cleanNumber.length === 11) {
    return SUPPORTED_REGIONS.find(r => r.code === 'US') || null;
  }
  
  if (cleanNumber.startsWith('61') && cleanNumber.length >= 10) {
    return SUPPORTED_REGIONS.find(r => r.code === 'AU') || null;
  }
  
  if (cleanNumber.startsWith('91') && cleanNumber.length >= 12) {
    return SUPPORTED_REGIONS.find(r => r.code === 'IN') || null;
  }
  
  return null;
}

export function isFromSupportedRegion(phoneNumber: string): boolean {
  return getRegionFromPhoneNumber(phoneNumber) !== null;
} 