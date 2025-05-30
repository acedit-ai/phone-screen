import { Country } from "react-phone-number-input";
import { 
  REGION_DEFINITIONS, 
  detectRegionFromCleanNumber, 
  getRegionByCode,
  type BaseRegion 
} from "./shared-regions";

export interface Region extends BaseRegion {
  phoneNumber?: string; // Optional on client-side
}

export const SUPPORTED_REGIONS: Region[] = REGION_DEFINITIONS.map(region => ({
  ...region,
  phoneNumber: undefined // Client-side doesn't need phone numbers
}));

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
  const regionCode = detectRegionFromCleanNumber(cleanNumber);
  
  if (regionCode) {
    const baseRegion = getRegionByCode(regionCode);
    return baseRegion ? { ...baseRegion, phoneNumber: undefined } : null;
  }
  
  return null;
}

export function isFromSupportedRegion(phoneNumber: string): boolean {
  return getRegionFromPhoneNumber(phoneNumber) !== null;
} 