"use client";

import { ParcelDetail } from "@/types/parcel";
import { getZoningCategory } from "@/lib/zoning-colors";

interface ParcelPanelProps {
  parcel: ParcelDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

function formatCurrency(value: number | null): string {
  if (value == null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number | null): string {
  if (value == null) return "--";
  return new Intl.NumberFormat("en-US").format(value);
}

export default function ParcelPanel({ parcel, loading, error, onClose }: ParcelPanelProps) {
  if (!parcel && !loading && !error) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[60vh] sm:top-0 sm:bottom-auto sm:left-auto sm:right-0 sm:h-full sm:w-[380px] bg-white shadow-2xl z-20 flex flex-col border-t sm:border-t-0 sm:border-l border-zinc-200 overflow-hidden rounded-t-2xl sm:rounded-none">
      {/* Mobile drag handle */}
      <div className="sm:hidden flex justify-center pt-2 pb-1 bg-zinc-900 shrink-0">
        <div className="w-10 h-1 rounded-full bg-zinc-600" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 sm:py-3 bg-zinc-900 text-white shrink-0">
        <div className="min-w-0">
          {parcel ? (
            <>
              <h2 className="text-sm font-semibold tracking-wide text-zinc-300">
                PIN {parcel.pin}
              </h2>
              <p className="text-base font-bold truncate">
                {parcel.situsAddress || "No address"}
              </p>
              <p className="text-xs text-zinc-400">
                {[parcel.city, "IL", parcel.zip].filter(Boolean).join(", ")}
              </p>
            </>
          ) : (
            <h2 className="text-base font-bold">
              {loading ? "Loading..." : "Property Details"}
            </h2>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-3 p-1.5 rounded-lg hover:bg-zinc-700 transition-colors shrink-0"
          aria-label="Close panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900" />
          </div>
        )}

        {error && (
          <div className="p-4">
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
          </div>
        )}

        {parcel && !loading && (
          <div className="divide-y divide-zinc-100">
            <Section title="Zoning Districts">
              {parcel.zoning ? (
                <Field
                  label="Zoning"
                  value={`${parcel.zoning} (${getZoningCategory(parcel.zoning)})`}
                />
              ) : (
                <div className="text-xs text-zinc-400 italic">Loading...</div>
              )}
              <Field label="Property Class" value={parcel.propertyClass} />
            </Section>

            {parcel.planningRegion && (
              <Section title="Planning Region">
                <Field label="Region" value={parcel.planningRegion} />
              </Section>
            )}

            {parcel.aro && (
              <Section title="Affordable Requirements (ARO)">
                <Field label="Status" value={parcel.aro} />
              </Section>
            )}

            {parcel.zoningMapIndex && (
              <Section title="Zoning Map Index">
                <Field label="Index" value={parcel.zoningMapIndex} />
                {parcel.waterRecordBooks && <Field label="Water Record Books" value={parcel.waterRecordBooks} />}
              </Section>
            )}

            <Section title="Building Address">
              <Field label="Address" value={parcel.situsAddress || "--"} />
            </Section>

            {parcel.eightyAcrePage && (
              <Section title="80 Acre Page">
                <Field label="Page" value={parcel.eightyAcrePage} />
              </Section>
            )}

            <Section title="Parcels">
              <Field label="PIN" value={parcel.pin} />
              <Field label="Parcel Address" value={parcel.situsAddress || "--"} />
            </Section>

            {parcel.tslBusRoutes && parcel.tslBusRoutes.length > 0 && (
              <Section title="TSL Bus Route">
                {parcel.tslBusRoutes.map((route, i) => (
                  <div key={i} className="text-sm text-zinc-900">{route}</div>
                ))}
              </Section>
            )}

            {parcel.aduZone && (
              <Section title="ADU (Accessory Dwelling Unit)">
                <Field label="Zone" value={parcel.aduZone} />
                {parcel.aduArea && <Field label="ADU Area" value={parcel.aduArea} />}
                {parcel.aduText && <Field label="Restrictions" value={parcel.aduText} />}
              </Section>
            )}

            {parcel.tifDistrict && (
              <Section title="Tax Increment Financing (TIF)">
                <Field label="Name" value={parcel.tifDistrict} />
                {parcel.tifExpiration && <Field label="Expiration" value={parcel.tifExpiration} />}
              </Section>
            )}

            {parcel.ward && (
              <Section title="Ward">
                <Field label="Ward" value={parcel.ward} />
                <Field label="Alderman" value={parcel.alderman} />
                {parcel.wardPhone && <Field label="Phone" value={parcel.wardPhone} />}
              </Section>
            )}

            {parcel.communityArea && (
              <Section title="Community Area">
                <Field label="Area" value={parcel.communityArea} />
              </Section>
            )}

            <Section title="Location">
              <Field label="Township" value={parcel.township} />
              <Field label="Neighborhood" value={parcel.neighborhood} />
            </Section>

            <Section title="Valuation">
              <Field label="Assessed Value" value={formatCurrency(parcel.assessedValue)} />
              <Field label="Est. Market Value" value={formatCurrency(parcel.marketValue)} />
              {parcel.taxYear && <Field label="Tax Year" value={String(parcel.taxYear)} />}
            </Section>

            <Section title="Property">
              <Field label="Lot Size" value={parcel.lotSize ? `${formatNumber(parcel.lotSize)} sqft` : "--"} />
              <Field label="Building Size" value={parcel.buildingSqFt ? `${formatNumber(parcel.buildingSqFt)} sqft` : "--"} />
              <Field label="Year Built" value={parcel.yearBuilt ? `~${parcel.yearBuilt}` : "--"} />
            </Section>

            {(parcel.saleDate || parcel.salePrice) && (
              <Section title="Last Sale">
                <Field label="Date" value={parcel.saleDate || "--"} />
                <Field label="Price" value={formatCurrency(parcel.salePrice)} />
              </Section>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {parcel && (
        <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-200 text-xs text-zinc-500 shrink-0">
          Data from Cook County Assessor &amp; City of Chicago
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-sm text-zinc-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-zinc-900 text-right truncate">
        {value || "--"}
      </span>
    </div>
  );
}
