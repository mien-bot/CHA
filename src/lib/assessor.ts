import { ParcelDetail, SearchResult } from "@/types/parcel";

// Cook County GIS Parcel Service (CookViewer3Parcels)
const PARCELS_API =
  "https://gis.cookcountyil.gov/traditional/rest/services/CookViewer3Parcels/MapServer/0/query";

const OUT_FIELDS = [
  "PIN14",
  "PIN14_dash",
  "street_address",
  "CITYNAME",
  "ZIP1",
  "CURRENTVALUE_TOTAL",
  "CURRENTVALUE_LAND",
  "CURRENTVALUE_BLDG",
  "LANDSF",
  "BLDGSQFT",
  "BCLASS",
  "class_description",
  "major_class_description",
  "township_name",
  "NBHD",
  "TAXYR",
  "BLDGAGE",
].join(",");

export async function fetchParcelByPIN(pin: string): Promise<ParcelDetail | null> {
  const cleanPIN = pin.replace(/[^0-9-]/g, "");
  const pin14 = cleanPIN.replace(/-/g, "");

  const where = `PIN14='${pin14}'`;

  const params = new URLSearchParams({
    where,
    outFields: OUT_FIELDS,
    f: "json",
    returnGeometry: "true",
    outSR: "4326",
  });

  const res = await fetch(`${PARCELS_API}?${params}`, {
    next: { revalidate: 86400 },
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data.features || data.features.length === 0) return null;

  return mapAttributes(data.features[0].attributes, data.features[0].geometry);
}

export async function fetchParcelByLocation(
  lng: number,
  lat: number
): Promise<ParcelDetail | null> {
  const buffer = 0.0001;
  const geometry = JSON.stringify({
    xmin: lng - buffer,
    ymin: lat - buffer,
    xmax: lng + buffer,
    ymax: lat + buffer,
    spatialReference: { wkid: 4326 },
  });

  const params = new URLSearchParams({
    geometry,
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
    outFields: OUT_FIELDS,
    f: "json",
    returnGeometry: "true",
    outSR: "4326",
    resultRecordCount: "1",
  });

  const res = await fetch(`${PARCELS_API}?${params}`, { next: { revalidate: 86400 } });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.features || data.features.length === 0) return null;

  return mapAttributes(data.features[0].attributes, data.features[0].geometry);
}

export async function searchParcels(query: string): Promise<SearchResult[]> {
  const clean = query.replace(/'/g, "''").trim().toUpperCase();

  const conditions = [
    `street_address LIKE '%${clean}%'`,
    `PIN14 LIKE '%${clean.replace(/-/g, "")}%'`,
  ];
  const where = conditions.join(" OR ");

  const params = new URLSearchParams({
    where,
    outFields: "PIN14,PIN14_dash,street_address,CITYNAME",
    f: "json",
    returnGeometry: "false",
    resultRecordCount: "15",
  });

  const res = await fetch(`${PARCELS_API}?${params}`);
  if (!res.ok) return [];

  const data = await res.json();
  if (!data.features) return [];

  return data.features.map(
    (f: { attributes: Record<string, string | null> }) => ({
      pin: f.attributes.PIN14_dash || formatPIN(f.attributes.PIN14 || ""),
      address: [f.attributes.street_address, f.attributes.CITYNAME]
        .filter(Boolean)
        .join(", ")
        .trim(),
      owner: "",
    })
  );
}

function formatPIN(pin14: string): string {
  if (pin14.length !== 14) return pin14;
  return `${pin14.slice(0, 2)}-${pin14.slice(2, 4)}-${pin14.slice(4, 7)}-${pin14.slice(7, 10)}-${pin14.slice(10, 14)}`;
}

function parseFormattedNumber(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function mapAttributes(attrs: Record<string, unknown>, geometry?: { rings?: number[][][] }): ParcelDetail {
  const assessedTotal = parseFormattedNumber(attrs.CURRENTVALUE_TOTAL);
  const marketValue = assessedTotal ? assessedTotal * 10 : null;

  const bldgAge = parseFormattedNumber(attrs.BLDGAGE);
  const yearBuilt = bldgAge ? new Date().getFullYear() - bldgAge : null;

  return {
    pin: (attrs.PIN14_dash as string) || formatPIN((attrs.PIN14 as string) || ""),
    owner: "",
    mailingAddress: "",
    situsAddress: ((attrs.street_address as string) || "").trim(),
    city: (attrs.CITYNAME as string) || "",
    zip: (attrs.ZIP1 as string) || "",
    zoning: "",
    zoningDescription: "",
    ward: "",
    alderman: "",
    wardPhone: "",
    assessedValue: assessedTotal,
    marketValue,
    lotSize: parseFormattedNumber(attrs.LANDSF),
    buildingSqFt: parseFormattedNumber(attrs.BLDGSQFT),
    yearBuilt,
    propertyClass: [attrs.BCLASS, attrs.class_description || attrs.major_class_description]
      .filter(Boolean)
      .join(" - "),
    neighborhood: attrs.NBHD ? String(attrs.NBHD) : "",
    township: (attrs.township_name as string) || "",
    saleDate: "",
    salePrice: null,
    taxYear: attrs.TAXYR ? parseInt(String(attrs.TAXYR), 10) || null : null,
    geometry: geometry?.rings ?? null,
    communityArea: "",
    planningRegion: "",
    aro: "",
    zoningMapIndex: "",
    waterRecordBooks: "",
    tifDistrict: "",
    tifExpiration: "",
    tslBusRoutes: [],
    eightyAcrePage: "",
    aduZone: "",
    aduArea: "",
    aduText: "",
  };
}
