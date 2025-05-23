export interface Region {
  code: string;
  name: string;
  flag: string;
  countryCode: string;
  phoneNumber: string;
  example: string;
}

export const SUPPORTED_REGIONS: Region[] = [
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    countryCode: '+1',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER_US || '',
    example: '+1 (555) 123-4567'
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    countryCode: '+61',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER_AU || '',
    example: '+61 4XX XXX XXX'
  },
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    countryCode: '+91',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER_US || '',
    example: '+91 XXXXX XXXXX'
  }
];

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

export function getCallFromNumber(toPhoneNumber: string): string {
  const region = getRegionFromPhoneNumber(toPhoneNumber);
  if (!region || !region.phoneNumber) {
    throw new Error(`Unsupported region for phone number: ${toPhoneNumber}`);
  }
  return region.phoneNumber;
} 