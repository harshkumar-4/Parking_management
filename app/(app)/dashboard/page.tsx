"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { ParkingSession, ParkingRate } from "@/lib/types";
import { fmtTimeShort, fmtDuration, calcAmount } from "@/lib/helpers";
import TicketView from "@/components/TicketView";
import Link from "next/link";

export default function DashboardPage() {
  const supabase = supabaseBrowser();
  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [ticket, setTicket] = useState<ParkingSession | null>(null);
  const [exitProcessing, setExitProcessing] = useState<string | null>(null);
  const [exitedSession, setExitedSession] = useState<ParkingSession | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update current time every 30 seconds for live elapsed duration counters
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("dashboard-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "parking_sessions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const { data } = await supabase.from("parking_sessions").select("*").order("entry_time", { ascending: false });
    setSessions((data as ParkingSession[]) ?? []);
    setLoading(false);
  }

  async function handleQuickExit(s: ParkingSession) {
    setExitProcessing(s.id);
    const { data: rates } = await supabase.from("parking_rates").select("*");
    const now = new Date().toISOString();
    const { amount, duration } = calcAmount((rates as ParkingRate[]) ?? [], s.vehicle_type, s.entry_time, now);
    
    const { data, error } = await supabase
      .from("parking_sessions")
      .update({ exit_time: now, duration_minutes: duration, parking_amount: amount, status: "exited" })
      .eq("id", s.id)
      .select()
      .single();

    setExitProcessing(null);
    if (!error && data) {
      setExitedSession(data as ParkingSession);
      load();
    }
  }

  const inside = sessions.filter((s) => s.status === "inside");
  const todayStr = new Date().toDateString();
  const exitedToday = sessions.filter((s) => s.status === "exited" && s.exit_time && new Date(s.exit_time).toDateString() === todayStr);
  const collectionToday = exitedToday.reduce((sum, s) => sum + Number(s.parking_amount || 0), 0);

  // Extract unique vehicle types for quick filter chips
  const vehicleTypes = useMemo(() => {
    const types = Array.from(new Set(inside.map((s) => s.vehicle_type)));
    return ["All", ...types];
  }, [inside]);

  const filtered = useMemo(() => {
    return inside.filter((s) => {
      const matchesSearch = !search || s.vehicle_number.includes(search.toUpperCase()) || (s.driver_name && s.driver_name.toLowerCase().includes(search.toLowerCase()));
      const matchesType = typeFilter === "All" || s.vehicle_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [inside, search, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Header */}
      <div className="bg-asphalt text-lane rounded-2xl p-5 sm:p-6 shadow-xl border border-asphalt2 relative overflow-hidden">
        {/* Subtle background ambient glow */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-48 h-48 bg-go/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-go/20 text-go border border-go/30">
                <span className="w-2 h-2 rounded-full bg-go animate-pulse" />
                Live System Active
              </span>
              <span className="text-steel text-xs font-medium">• {currentTime.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}</span>
            </div>
            <h2 className="font-sign font-bold text-2xl sm:text-3xl text-lane tracking-tight">
              Parking Overview
            </h2>
            <p className="text-steel text-xs sm:text-sm mt-0.5">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/entry"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-amber hover:bg-amberDim text-asphalt font-bold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl shadow-lg transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>+ New Entry</span>
            </Link>

            <Link
              href="/exit"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-asphalt2 hover:bg-white/10 text-lane font-semibold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl border border-white/10 transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Vehicle Exit</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Modern Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Stat 1: Vehicles Inside */}
        <div className="bg-white border border-steelLine rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-go/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-steel uppercase tracking-wider">Vehicles Inside</span>
            <div className="w-9 h-9 rounded-xl bg-[#E6F4EC] text-go flex items-center justify-center shadow-xs">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-sign font-bold text-3xl sm:text-4xl text-asphalt tracking-tight">{inside.length}</span>
            <span className="inline-flex items-center text-[11px] font-semibold text-go bg-go/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-go mr-1 animate-ping" />
              Parked now
            </span>
          </div>
        </div>

        {/* Stat 2: Exited Today */}
        <div className="bg-white border border-steelLine rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-stop/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-steel uppercase tracking-wider">Exited Today</span>
            <div className="w-9 h-9 rounded-xl bg-[#FBEAE8] text-stop flex items-center justify-center shadow-xs">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-sign font-bold text-3xl sm:text-4xl text-asphalt tracking-tight">{exitedToday.length}</span>
            <span className="text-[11px] font-medium text-steel">Sessions completed</span>
          </div>
        </div>

        {/* Stat 3: Today's Revenue */}
        <div className="bg-white border border-steelLine rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber/10 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-steel uppercase tracking-wider">Today's Collection</span>
            <div className="w-9 h-9 rounded-xl bg-amber/20 text-asphalt flex items-center justify-center font-bold text-base shadow-xs">
              ₹
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-sign font-bold text-3xl sm:text-4xl text-asphalt tracking-tight">₹{collectionToday}</span>
            <span className="text-[11px] font-semibold text-amberDim bg-amber/10 px-2 py-0.5 rounded-full ml-1">Cash</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-steelLine rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        {/* Controls Bar: Search & Category Chips */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h3 className="font-sign font-bold text-xl text-asphalt flex items-center gap-2">
              <span>Currently Parked</span>
              <span className="bg-asphalt text-lane text-xs font-bold px-2.5 py-0.5 rounded-full font-sans">
                {filtered.length}
              </span>
            </h3>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by vehicle number or driver..."
                className="w-full pl-9 pr-8 py-2.5 border border-steelLine rounded-xl text-base sm:text-sm bg-lane/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber transition-all shadow-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-asphalt text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Quick Category Filter Chips */}
          {vehicleTypes.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              <span className="text-xs text-steel font-semibold mr-1 shrink-0">Filter:</span>
              {vehicleTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    typeFilter === t
                      ? "bg-asphalt text-lane shadow-xs scale-105"
                      : "bg-lane text-steel hover:bg-steelLine/50 hover:text-asphalt"
                  }`}
                >
                  {t} {t !== "All" && `(${inside.filter((s) => s.vehicle_type === t).length})`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content List */}
        {loading ? (
          <div className="py-12 text-center text-steel">
            <div className="inline-block w-6 h-6 border-2 border-amber border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-sm">Loading vehicle sessions…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-2 border-dashed border-steelLine rounded-xl p-8 sm:p-12 text-center text-steel bg-lane/20">
            <div className="w-12 h-12 rounded-full bg-asphalt/5 text-asphalt flex items-center justify-center mx-auto mb-3">
              🚗
            </div>
            <p className="font-sign font-bold text-asphalt text-lg mb-1">
              {search || typeFilter !== "All" ? "No matching vehicles found" : "No vehicles parked inside right now"}
            </p>
            <p className="text-xs sm:text-sm text-steel max-w-sm mx-auto">
              {search || typeFilter !== "All" ? "Try adjusting your search query or vehicle type filter." : "Click '+ New Entry' to log a vehicle entry into the parking system."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card List View (< md) */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {filtered.map((s) => (
                <div
                  key={s.id}
                  className="bg-white border border-steelLine rounded-xl p-4 shadow-sm hover:border-amber/50 transition-all flex flex-col gap-3 relative"
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Authentic Indian License Plate Badge */}
                    <div className="inline-flex items-center bg-[#FFCC00] text-black font-sign font-bold text-base px-3 py-1 rounded border-2 border-black shadow-xs tracking-wider">
                      <span className="text-[9px] font-sans font-extrabold mr-1.5 opacity-80 border-r border-black/30 pr-1">IND</span>
                      {s.vehicle_number}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-steel bg-lane px-2 py-0.5 rounded">
                        ⏳ {fmtDuration(s.entry_time)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-y border-dashed border-steelLine/60 py-2.5 bg-lane/30 -mx-4 px-4">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-steel">Driver</span>
                      <span className="font-semibold text-asphalt text-xs block truncate">{s.driver_name || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-steel">Type</span>
                      <span className="font-semibold text-asphalt text-xs block">{s.vehicle_type}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-steel">Entry Time</span>
                      <span className="font-semibold text-asphalt text-xs block">{fmtTimeShort(s.entry_time)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-steel">Rate / Slab</span>
                      <span className="font-semibold text-asphalt text-xs block">₹{s.parking_amount}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      onClick={() => setTicket(s)}
                      className="flex-1 border border-steelLine hover:border-asphalt text-asphalt text-xs font-semibold py-2 rounded-lg bg-lane hover:bg-white transition-colors text-center"
                    >
                      Receipt
                    </button>
                    <button
                      onClick={() => handleQuickExit(s)}
                      disabled={exitProcessing === s.id}
                      className="flex-1 bg-asphalt hover:bg-asphalt2 text-lane text-xs font-semibold py-2 rounded-lg transition-colors text-center disabled:opacity-50"
                    >
                      {exitProcessing === s.id ? "Processing…" : "Quick Exit"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block border border-steelLine rounded-xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-steelLine text-left text-steel text-xs uppercase tracking-wider bg-lane/60">
                    <th className="py-3 px-4">Vehicle Number</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Driver Name</th>
                    <th className="py-3 px-4">Entry Time</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Rate</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steelLine">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-amber/5 transition-colors group">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center bg-[#FFCC00] text-black font-sign font-bold text-base px-2.5 py-0.5 rounded border-2 border-black tracking-wider shadow-2xs">
                          <span className="text-[8px] font-sans font-extrabold mr-1 opacity-75 border-r border-black/30 pr-1">IND</span>
                          {s.vehicle_number}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-asphalt">{s.vehicle_type}</td>
                      <td className="py-3 px-4 text-asphalt font-medium">{s.driver_name}</td>
                      <td className="py-3 px-4 text-steel whitespace-nowrap">{fmtTimeShort(s.entry_time)}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center text-xs font-semibold text-go bg-[#E6F4EC] px-2 py-0.5 rounded-full">
                          ⏳ {fmtDuration(s.entry_time)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-asphalt">₹{s.parking_amount}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setTicket(s)}
                            className="border border-steelLine hover:border-asphalt hover:bg-lane text-asphalt text-xs font-semibold px-3 py-1.5 rounded-md transition-all"
                          >
                            Receipt
                          </button>
                          <button
                            onClick={() => handleQuickExit(s)}
                            disabled={exitProcessing === s.id}
                            className="bg-amber hover:bg-amberDim text-asphalt text-xs font-bold px-3 py-1.5 rounded-md transition-all shadow-2xs disabled:opacity-50"
                          >
                            {exitProcessing === s.id ? "Exiting…" : "Exit"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Ticket Modal */}
      {(ticket || exitedSession) && (
        <div
          className="fixed inset-0 bg-asphalt/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto z-50 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setTicket(null);
              setExitedSession(null);
            }
          }}
        >
          <TicketView
            session={(ticket || exitedSession)!}
            onClose={() => {
              setTicket(null);
              setExitedSession(null);
            }}
          />
        </div>
      )}
    </div>
  );
}


