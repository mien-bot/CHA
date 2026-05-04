import { ParcelDetail, SearchResult } from "@/types/parcel";

// Cook County GIS Parcel Service
const PARCELS_API =
  "https://gis.cookcountyil.gov/traditional/rest/services/cookVoterParcels/MapServer/0/query";

const OUT_FIELDS = [
  "PIN14",
  "PIN",
  "TAXPAYER_NAME",
  "MAIL_ADDR",
  "MAIL_CITY",
  "MAIL_STATE",
  "MAIL_ZIP",
  "ADDR",
  "CITY",
  "ZIP",
  "CLASS",
  "AV_BLDG",
  "AV_LAND",
  "AV_TOTAL",
  "SQ_FT",
  "BLDG_SF",
  "YEAR_BUILT",
  "NBHD",
  "TOWNSHIP_NAME",
  "SALE_DATE",
  "SALE_PRICE",
  "TAX_YEAR",
].join(",");

export async function fetchParcelByPIN(pin: string): Promise<ParcelDetail | null> {
  const cleanPIN = pin.replace(/[^0-9-]/g, "");
  // PIN14 is the 14-digit version without dashes
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
  const params = new URLSearchParams({
    geometry: JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } }),
    geometryType: "esriGeometryPoint",
    spatialRel: "esriSpatialRelIntersects",
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

export async function searchParcels(query: string): Promise<SearchResult[]> {
  const clean = query.replace(/'/g, "''").trim().toUpperCase();

  // Build WHERE clause: try PIN, address, owner
  const conditions = [
    `ADDR LIKE '%${clean}%'`,
    `TAXPAYER_NAME LIKE '%${clean}%'`,
    `PIN14 LIKE '%${clean.replace(/-/g, "")}%'`,
  ];
  const where = conditions.join(" OR ");

  const params = new URLSearchParams({
    where,
    outFields: "PIN14,ADDR,CITY,TAXPAYER_NAME",
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
      pin: formatPIN(f.attributes.PIN14 || ""),
      address: [f.attributes.ADDR, f.attributes.CITY]
        .filter(Boolean)
        .join(", ")
        .trim(),
      owner: f.attributes.TAXPAYER_NAME || "",
    })
  );
}

function formatPIN(pin14: string): string {
  if (pin14.length !== 14) return pin14;
  // Format as XX-XX-XXX-XXX-XXXX
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
  const avTotal = parseFormattedNumber(attrs.AV_TOTAL);
  // Cook County market value is roughly 10x assessed value (10% assessment ratio)
  const marketValue = avTotal ? avTotal * 10 : null;

  return {
    pin: formatPIN((attrs.PIN14 as string) || (attrs.PIN as string) || ""),
    owner: (attrs.TAXPAYER_NAME as string) || "",
    mailingAddress: [attrs.MAIL_ADDR, attrs.MAIL_CITY, attrs.MAIL_STATE, attrs.MAIL_ZIP]
      .filter(Boolean)
      .join(", "),
    situsAddress: ((attrs.ADDR as string) || "").trim(),
    city: (attrs.CITY as string) || "",
    zip: (attrs.ZIP as string) || "",
    zoning: "",
    assessedValue: avTotal,
    marketValue,
    lotSize: parseFormattedNumber(attrs.SQ_FT),
    buildingSqFt: parseFormattedNumber(attrs.BLDG_SF),
    yearBuilt: attrs.YEAR_BUILT ? parseInt(String(attrs.YEAR_BUILT), 10) || null : null,
    propertyClass: (attrs.CLASS as string) || "",
    neighborhood: (attrs.NBHD as string) || "",
    township: (attrs.TOWNSHIP_NAME as string) || "",
    saleDate: attrs.SALE_DATE ? formatDate(attrs.SALE_DATE as number) : "",
    salePrice: parseFormattedNumber(attrs.SALE_PRICE),
    taxYear: attrs.TAX_YEAR ? parseInt(String(attrs.TAX_YEAR), 10) || null : null,
    geometry: geometry?.rings ?? null,
  };
}

function formatDate(timestamp: number): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}
