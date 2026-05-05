export interface ParcelDetail {
  pin: string;
  owner: string;
  mailingAddress: string;
  situsAddress: string;
  city: string;
  zip: string;
  zoning: string;
  zoningDescription: string;
  ward: string;
  alderman: string;
  wardPhone: string;
  assessedValue: number | null;
  marketValue: number | null;
  lotSize: number | null;
  buildingSqFt: number | null;
  yearBuilt: number | null;
  propertyClass: string;
  neighborhood: string;
  township: string;
  saleDate: string;
  salePrice: number | null;
  taxYear: number | null;
  geometry?: number[][][] | null;
  // Additional Chicago-specific fields
  communityArea: string;
  planningRegion: string;
  aro: string;
  zoningMapIndex: string;
  tifDistrict: string;
  tifExpiration: string;
}

export interface SearchResult {
  pin: string;
  address: string;
  owner: string;
}

export interface ParcelFeatureProperties {
  PIN14: string;
  ADDR?: string;
  CITY?: string;
  ZIP?: string;
}
