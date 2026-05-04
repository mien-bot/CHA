export const ZONING_COLORS: Record<string, string> = {
  // Residential
  "RS-1": "#c8e6c9",
  "RS-2": "#a5d6a7",
  "RS-3": "#81c784",
  "RT-3.5": "#66bb6a",
  "RT-4": "#4caf50",
  "RM-4.5": "#43a047",
  "RM-5": "#388e3c",
  "RM-5.5": "#2e7d32",
  "RM-6": "#1b5e20",
  "RM-6.5": "#174f1a",
  // Business
  "B1-1": "#bbdefb",
  "B1-2": "#90caf9",
  "B1-3": "#64b5f6",
  "B2-1": "#42a5f5",
  "B2-2": "#2196f3",
  "B2-3": "#1e88e5",
  "B3-1": "#1976d2",
  "B3-2": "#1565c0",
  "B3-3": "#0d47a1",
  // Commercial
  "C1-1": "#e1bee7",
  "C1-2": "#ce93d8",
  "C1-3": "#ba68c8",
  "C2-1": "#ab47bc",
  "C2-2": "#9c27b0",
  "C3-1": "#8e24aa",
  // Downtown
  "DC-12": "#f48fb1",
  "DC-16": "#f06292",
  "DX-3": "#ec407a",
  "DX-5": "#e91e63",
  "DX-7": "#d81b60",
  "DX-12": "#c2185b",
  "DX-16": "#ad1457",
  // Manufacturing
  "M1-1": "#ffecb3",
  "M1-2": "#ffe082",
  "M1-3": "#ffd54f",
  "M2-1": "#ffca28",
  "M2-2": "#ffc107",
  "M2-3": "#ffb300",
  "M3-3": "#ffa000",
  "M3-4": "#ff8f00",
  "M3-5": "#ff6f00",
  // Planned Development
  "PD": "#ffcc80",
  "PMD": "#ffb74d",
  // Parks
  "POS-1": "#b9f6ca",
  "POS-2": "#69f0ae",
};

export function getZoningColor(code: string): string {
  if (!code) return "#e0e0e0";
  if (ZONING_COLORS[code]) return ZONING_COLORS[code];
  const prefix = code.split("-")[0].replace(/[0-9.]/g, "");
  if (prefix === "RS" || prefix === "RT" || prefix === "RM") return "#81c784";
  if (prefix === "B") return "#64b5f6";
  if (prefix === "C") return "#ce93d8";
  if (prefix === "D" || prefix === "DC" || prefix === "DX") return "#f06292";
  if (prefix === "M") return "#ffe082";
  if (prefix === "PD" || prefix === "PMD") return "#ffcc80";
  if (prefix === "POS") return "#69f0ae";
  return "#e0e0e0";
}

export function getZoningCategory(code: string): string {
  if (!code) return "Unknown";
  const prefix = code.split("-")[0].replace(/[0-9.]/g, "");
  if (prefix === "RS") return "Residential Single-Family";
  if (prefix === "RT") return "Residential Two-Flat";
  if (prefix === "RM") return "Residential Multi-Unit";
  if (prefix === "B") return "Business";
  if (prefix === "C") return "Commercial";
  if (prefix === "DC" || prefix === "DX" || prefix === "DR") return "Downtown";
  if (prefix === "M") return "Manufacturing";
  if (prefix === "PD" || prefix === "PMD") return "Planned Development";
  if (prefix === "POS") return "Parks/Open Space";
  if (prefix === "T") return "Transportation";
  return "Other";
}

export const ZONING_LEGEND = [
  { label: "Residential", color: "#81c784" },
  { label: "Business", color: "#64b5f6" },
  { label: "Commercial", color: "#ce93d8" },
  { label: "Downtown", color: "#f06292" },
  { label: "Manufacturing", color: "#ffe082" },
  { label: "Planned Dev.", color: "#ffcc80" },
  { label: "Parks/Open Space", color: "#69f0ae" },
  { label: "Other", color: "#e0e0e0" },
];
