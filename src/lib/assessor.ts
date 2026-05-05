import { ParcelDetail, SearchResult } from "@/types/parcel";

// Cook County GIS Parcel Service (CookViewer3Parcels)
const PARCELS_API =
  "https://gis.cookcountyil.gov/traditional/rest/services/CookViewer3Parcels/MapServer/0/query";

// City of Chicago Zoning query
const ZONING_API =
  "https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/Zoning/MapServer/1/query";

// City of Chicago Ward query
const WARD_API =
  "https://gisapps.chicago.gov/arcgis/rest/services/311/311_layers/MapServer/21/query";

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

async function fetchZoningAtPoint(lng: number, lat: number) {
  try {
    const params = new URLSearchParams({
      geometry: `${lng},${lat}`,
      geometryType: "esriGeometryPoint",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "ZONE_CLASS,ZONE_TYPE",
      f: "json",
      returnGeometry: "false",
    });
    const res = await fetch(`${ZONING_API}?${params}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.features?.length) return null;
    return data.features[0].attributes as { ZONE_CLASS: string; ZONE_TYPE: number };
  } catch {
    return null;
  }
}

async function fetchWardAtPoint(lng: number, lat: number) {
  try {
    const params = new URLSearchParams({
      geometry: `${lng},${lat}`,
      geometryType: "esriGeometryPoint",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "WARD,ALDERMAN,WARD_PHONE",
      f: "json",
      returnGeometry: "false",
    });
    const res = await fetch(`${WARD_API}?${params}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.features?.length) return null;
    return data.features[0].attributes as { WARD: string; ALDERMAN: string; WARD_PHONE: string };
  } catch {
    return null;
  }
}

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

  const parcel = mapAttributes(data.features[0].attributes, data.features[0].geometry);

  // Get centroid for zoning/ward lookup
  const centroid = getCentroid(data.features[0].geometry?.rings);
  if (centroid) {
    const [zoning, ward] = await Promise.all([
      fetchZoningAtPoint(centroid[0], centroid[1]),
      fetchWardAtPoint(centroid[0], centroid[1]),
    ]);
    if (zoning) {
      parcel.zoning = zoning.ZONE_CLASS || "";
    }
    if (ward) {
      parcel.ward = ward.WARD || "";
      parcel.alderman = ward.ALDERMAN || "";
      parcel.wardPhone = ward.WARD_PHONE || "";
    }
  }

  return parcel;
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

  // Fetch parcel, zoning, and ward in parallel
  const [parcelRes, zoning, ward] = await Promise.all([
    fetch(`${PARCELS_API}?${params}`, { next: { revalidate: 86400 } }),
    fetchZoningAtPoint(lng, lat),
    fetchWardAtPoint(lng, lat),
  ]);

  if (!parcelRes.ok) return null;

  const data = await parcelRes.json();
  if (!data.features || data.features.length === 0) return null;

  const parcel = mapAttributes(data.features[0].attributes, data.features[0].geometry);

  if (zoning) {
    parcel.zoning = zoning.ZONE_CLASS || "";
  }
  if (ward) {
    parcel.ward = ward.WARD || "";
    parcel.alderman = ward.ALDERMAN || "";
    parcel.wardPhone = ward.WARD_PHONE || "";
  }

  return parcel;
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

function getCentroid(rings?: number[][][]): [number, number] | null {
  if (!rings || !rings[0] || rings[0].length === 0) return null;
  const ring = rings[0];
  let sumX = 0, sumY = 0;
  for (const [x, y] of ring) {
    sumX += x;
    sumY += y;
  }
  return [sumX / ring.length, sumY / ring.length];
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
  };
}
