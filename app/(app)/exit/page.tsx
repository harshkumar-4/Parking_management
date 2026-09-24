"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { ParkingRate, ParkingSession } from "@/lib/types";
import { calcAmount, fmtTime } from "@/lib/helpers";
import TicketView from "@/components/TicketView";

export default function ExitPage() {
  const supabase = supabaseBrowser();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<ParkingSession | null | undefined>(undefined);
  const [exited, setExited] = useState<ParkingSession | null>(null);
  const [processing, setProcessing] = useState(false);

  async function search() {
    const q = query.trim().toUpperCase();
    if (!q) return;
    const { data } = await supabase
      .from("parking_sessions")
      .select("*")
      .eq("vehicle_number", q)
      .eq("status", "inside")
      .limit(1)
      .maybeSingle();
    setFound((data as ParkingSession) ?? null);
  }

  async function vehicleOut() {
    if (!found) return;
    setProcessing(true);
    const { data: rates } = await supabase.from("parking_rates").select("*");
    const now = new Date().toISOString();
    const { amount, duration } = calcAmount((rates as ParkingRate[]) ?? [], found.vehicle_type, found.entry_time, now);
    const { data, error } = await supabase
      .from("parking_sessions")
      .update({ exit_time: now, duration_minutes: duration, parking_amount: amount, status: "exited" })
      .eq("id", found.id)
      .select()
      .single();
    setProcessing(false);
    if (!error) {
      setExited(data as ParkingSession);
      setFound(undefined);
      setQuery("");
    }
  }

  return (
    <div>
      <h2 className="font-sign font-semibold text-xl sm:text-2xl mb-0.5">Vehicle exit</h2>
      <p className="text-steel text-xs sm:text-sm mb-5">Search the vehicle number to close out its session.</p>

      <div className="flex flex-col xs:flex-row gap-2.5 mb-5 max-w-lg">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Enter vehicle number…"
          className="flex-1 px-3.5 py-2.5 border border-steelLine rounded-lg text-base sm:text-sm bg-white uppercase font-sign font-semibold tracking-wider focus:outline-none focus:ring-2 focus:ring-amber shadow-sm"
        />
        <button
          onClick={search}
          className="bg-asphalt text-lane font-semibold text-sm px-6 py-2.5 rounded-lg shadow-sm hover:bg-asphalt2 transition-transform active:scale-[0.98]"
        >
          Search
        </button>
      </div>

      {found === null && (
        <div className="bg-white border border-steelLine rounded-xl p-5 sm:p-6 max-w-lg text-center text-steel shadow-sm">
          No active vehicle found for "<span className="font-semibold text-asphalt">{query.toUpperCase()}</span>".
        </div>
      )}

      {found && (
        <div className="bg-white border border-steelLine rounded-xl p-4 sm:p-6 max-w-lg shadow-sm">
          <Row k="Vehicle" v={found.vehicle_number} isVehicle />
          <Row k="Driver" v={found.driver_name} />
          <Row k="Entry" v={fmtTime(found.entry_time)} />
          <Row k="Status" v="🟢 Inside" green />
          
          <button
            onClick={vehicleOut}
            disabled={processing}
            className="w-full bg-amber hover:bg-amberDim text-asphalt font-bold text-base py-3.5 rounded-lg mt-5 shadow-sm transition-transform active:scale-[0.99] disabled:opacity-50"
          >
            {processing ? "Processing…" : "VEHICLE OUT"}
          </button>
        </div>
      )}

      {exited && (
        <div
          className="fixed inset-0 bg-asphalt/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto z-50 animate-fadeIn"
          onClick={(e) => e.target === e.currentTarget && setExited(null)}
        >
          <TicketView session={exited} onClose={() => setExited(null)} />
        </div>
      )}
    </div>
  );
}

function Row({ k, v, green, isVehicle }: { k: string; v: string; green?: boolean; isVehicle?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm py-2.5 border-b border-dotted border-steelLine last:border-0">
      <span className="text-steel">{k}</span>
      <span className={`font-semibold ${green ? "text-go" : ""} ${isVehicle ? "font-sign text-base text-asphalt bg-amber/20 px-2 py-0.5 rounded border border-amber/40" : ""}`}>
        {v}
      </span>
    </div>
  );
}

