"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { ParkingRate } from "@/lib/types";

export default function RatesPage() {
  const supabase = supabaseBrowser();
  const [rates, setRates] = useState<ParkingRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const { data } = await supabase.from("parking_rates").select("*").order("created_at");
    setRates((data as ParkingRate[]) ?? []);
    setLoading(false);
  }

  async function updateRate(id: string, patch: Partial<ParkingRate>) {
    setRates((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    await supabase.from("parking_rates").update(patch).eq("id", id);
  }

  async function addRate() {
    const { data } = await supabase.from("parking_rates").insert({ vehicle_type: "New type", rate: 0, duration_hours: 1 }).select().single();
    if (data) setRates((rs) => [...rs, data as ParkingRate]);
  }

  async function removeRate(id: string) {
    setRates((rs) => rs.filter((r) => r.id !== id));
    await supabase.from("parking_rates").delete().eq("id", id);
  }

  return (
    <div>
      <h2 className="font-sign font-semibold text-xl sm:text-2xl mb-0.5">Parking rates</h2>
      <p className="text-steel text-xs sm:text-sm mb-5">Amount is charged per slab — a session is rounded up to the next slab.</p>

      <div className="bg-white border border-steelLine rounded-xl p-4 sm:p-6 max-w-2xl shadow-sm">
        {loading ? (
          <p className="text-steel text-sm py-4 text-center">Loading rates…</p>
        ) : (
          <>
            {/* Desktop Table Headers (>= sm) */}
            <div className="hidden sm:grid grid-cols-[1.4fr_1fr_1fr_auto] gap-3 mb-2.5 text-xs font-semibold text-steel px-1">
              <span>Vehicle type</span>
              <span>Rate (₹)</span>
              <span>Per hours</span>
              <span className="w-16">Action</span>
            </div>

            {/* Rate Items List */}
            <div className="space-y-4 sm:space-y-2.5 mb-4">
              {rates.map((r) => (
                <div
                  key={r.id}
                  className="bg-lane/50 sm:bg-transparent border sm:border-0 border-steelLine rounded-lg p-3.5 sm:p-0 grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr_auto] gap-3 items-center"
                >
                  {/* Vehicle Type */}
                  <div>
                    <label className="block sm:hidden text-[10px] font-semibold uppercase text-steel mb-1">Vehicle Type</label>
                    <input
                      defaultValue={r.vehicle_type}
                      onBlur={(e) => updateRate(r.id, { vehicle_type: e.target.value })}
                      className="w-full px-3 py-2 border border-steelLine rounded-md text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber"
                    />
                  </div>

                  {/* Rate (₹) */}
                  <div>
                    <label className="block sm:hidden text-[10px] font-semibold uppercase text-steel mb-1">Rate (₹)</label>
                    <input
                      type="number"
                      defaultValue={r.rate}
                      onBlur={(e) => updateRate(r.id, { rate: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-steelLine rounded-md text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber"
                    />
                  </div>

                  {/* Per hours */}
                  <div>
                    <label className="block sm:hidden text-[10px] font-semibold uppercase text-steel mb-1">Per Slab (Hours)</label>
                    <input
                      type="number"
                      defaultValue={r.duration_hours}
                      onBlur={(e) => updateRate(r.id, { duration_hours: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-steelLine rounded-md text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber"
                    />
                  </div>

                  {/* Remove Action */}
                  <div className="flex justify-end pt-1 sm:pt-0">
                    <button
                      onClick={() => removeRate(r.id)}
                      className="w-full sm:w-auto border border-stop/30 hover:border-stop text-stop text-xs font-semibold px-3 py-2 rounded-md hover:bg-stop/10 transition-colors text-center"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={addRate}
          className="w-full sm:w-auto border border-asphalt text-asphalt hover:bg-asphalt hover:text-lane font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-lg transition-colors shadow-xs"
        >
          + Add vehicle type
        </button>
      </div>
    </div>
  );
}

