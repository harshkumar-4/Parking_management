"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { ParkingSession, ParkingPass, ParkingRate } from "@/lib/types";
import { fmtTime, fmtTimeShort, fmtDuration, calcAmount, daysUntilExpiry, passMessage, waLink, smsLink, telLink } from "@/lib/helpers";
import TicketView from "@/components/TicketView";
import PaymentModal from "@/components/PaymentModal";
import Link from "next/link";

export default function SearchPage() {
  const supabase = supabaseBrowser();

  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [passes, setPasses] = useState<ParkingPass[]>([]);
  const [rates, setRates] = useState<ParkingRate[]>([]);
  const [recentPlates, setRecentPlates] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  
  const [selectedTicket, setSelectedTicket] = useState<ParkingSession | null>(null);
  const [selectedExitSession, setSelectedExitSession] = useState<{ session: ParkingSession; amount: number } | null>(null);
  const [exitProcessing, setExitProcessing] = useState<string | null>(null);

  // Fetch recent plates and rates on load
  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase
        .from("parking_sessions")
        .select("vehicle_number")
        .order("entry_time", { ascending: false })
        .limit(30);

      if (sessionData) {
        const unique = Array.from(new Set(sessionData.map((s) => s.vehicle_number))).slice(0, 8);
        setRecentPlates(unique);
      }

      const { data: rateData } = await supabase.from("parking_rates").select("*");
      setRates((rateData as ParkingRate[]) ?? []);
      setInitialLoaded(true);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Perform database search when query changes
  async function performSearch(searchTerm: string) {
    const cleanTerm = searchTerm.trim().toUpperCase();
    setSearchedQuery(cleanTerm);
    if (!cleanTerm) {
      setSessions([]);
      setPasses([]);
      return;
    }

    setLoading(true);

    const [sessionRes, passRes] = await Promise.all([
      supabase
        .from("parking_sessions")
        .select("*")
        .ilike("vehicle_number", `%${cleanTerm}%`)
        .order("entry_time", { ascending: false }),
      supabase
        .from("parking_passes")
        .select("*")
        .ilike("vehicle_number", `%${cleanTerm}%`)
        .order("issued_date", { ascending: false }),
    ]);

    setSessions((sessionRes.data as ParkingSession[]) ?? []);
    setPasses((passRes.data as ParkingPass[]) ?? []);
    setLoading(false);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    performSearch(query);
  }

  function selectRecentPlate(plate: string) {
    setQuery(plate);
    performSearch(plate);
  }

  // Group fetched sessions by vehicle number
  const groupedVehicles = useMemo(() => {
    const map = new Map<
      string,
      {
        vehicleNumber: string;
        sessions: ParkingSession[];
        passes: ParkingPass[];
        driverName: string;
        driverPhone: string;
        vehicleType: string;
      }
    >();

    sessions.forEach((s) => {
      const v = s.vehicle_number;
      if (!map.has(v)) {
        map.set(v, {
          vehicleNumber: v,
          sessions: [],
          passes: [],
          driverName: s.driver_name || "",
          driverPhone: s.driver_phone || "",
          vehicleType: s.vehicle_type,
        });
      }
      const item = map.get(v)!;
      item.sessions.push(s);
      if (!item.driverName && s.driver_name) item.driverName = s.driver_name;
      if (!item.driverPhone && s.driver_phone) item.driverPhone = s.driver_phone;
    });

    passes.forEach((p) => {
      const v = p.vehicle_number;
      if (!map.has(v)) {
        map.set(v, {
          vehicleNumber: v,
          sessions: [],
          passes: [],
          driverName: p.driver_name || "",
          driverPhone: p.driver_phone || "",
          vehicleType: p.vehicle_type,
        });
      }
      const item = map.get(v)!;
      item.passes.push(p);
      if (!item.driverName && p.driver_name) item.driverName = p.driver_name;
      if (!item.driverPhone && p.driver_phone) item.driverPhone = p.driver_phone;
    });

    return Array.from(map.values());
  }, [sessions, passes]);

  async function handleQuickExit(s: ParkingSession) {
    if (s.covered_by_pass) {
      completeQuickExit(s, 0, "Pass");
      return;
    }

    setExitProcessing(s.id);
    const now = new Date().toISOString();
    let effectiveRates = rates;
    if (s.helmet && s.vehicle_type === "Bike") {
      effectiveRates = effectiveRates.map((r) =>
        r.vehicle_type === "Bike" ? { ...r, rate: Number(r.rate) + 5 } : r
      );
    }
    const res = calcAmount(effectiveRates, s.vehicle_type, s.entry_time, now);
    setExitProcessing(null);
    setSelectedExitSession({ session: s, amount: res.amount });
  }

  async function completeQuickExit(s: ParkingSession, amount: number, method: "Cash" | "Paytm" | "Pass") {
    setExitProcessing(s.id);
    const now = new Date().toISOString();
    const duration = Math.max(1, Math.round((new Date(now).getTime() - new Date(s.entry_time).getTime()) / 60000));

    const { data, error } = await supabase
      .from("parking_sessions")
      .update({
        exit_time: now,
        duration_minutes: duration,
        parking_amount: amount,
        payment_method: method,
        status: "exited",
      })
      .eq("id", s.id)
      .select()
      .single();

    setExitProcessing(null);
    setSelectedExitSession(null);

    if (!error && data) {
      performSearch(searchedQuery);
    }
  }

  async function renewPass(id: string) {
    const today = new Date().toISOString().split("T")[0];
    const expiry = new Date(today);
    expiry.setDate(expiry.getDate() + 30);
    const expiryStr = expiry.toISOString().split("T")[0];

    const { data } = await supabase
      .from("parking_passes")
      .update({ issued_date: today, expiry_date: expiryStr })
      .eq("id", id)
      .select()
      .single();

    if (data) {
      performSearch(searchedQuery);
    }
  }

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div>
        <h2 className="font-sign font-semibold text-xl sm:text-2xl mb-0.5">Vehicle Search & Details</h2>
        <p className="text-steel text-xs sm:text-sm">
          Enter any vehicle number to fetch complete database records, parking history, pass status, and driver contact options.
        </p>
      </div>

      {/* Main Search Bar Card */}
      <div className="bg-white border border-steelLine rounded-2xl p-4 sm:p-6 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <label className="block text-xs font-semibold text-steel uppercase tracking-wider">
            Search Vehicle Number
          </label>
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel pointer-events-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  performSearch(e.target.value);
                }}
                placeholder="e.g. GJ01AB1234 or 1234..."
                className="w-full pl-11 pr-10 py-3 border-2 border-steelLine focus:border-amber rounded-xl text-base sm:text-lg bg-lane/20 focus:bg-white uppercase tracking-wider font-sign font-bold text-asphalt outline-none transition-all shadow-2xs"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    performSearch("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-asphalt text-xs px-2 py-1 rounded bg-asphalt/5 hover:bg-asphalt/10"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-amber hover:bg-amberDim text-asphalt font-bold text-sm sm:text-base px-6 py-3 rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
            >
              {loading ? "Searching..." : "Fetch Details"}
            </button>
          </div>
        </form>

        {/* Quick Recent Chips */}
        {recentPlates.length > 0 && !searchedQuery && (
          <div className="mt-4 pt-3 border-t border-steelLine/60 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-steel">Recent vehicles:</span>
            {recentPlates.map((plate) => (
              <button
                key={plate}
                onClick={() => selectRecentPlate(plate)}
                className="inline-flex items-center bg-[#FFCC00]/20 hover:bg-[#FFCC00]/40 text-asphalt font-sign font-bold text-xs px-2.5 py-1 rounded border border-[#FFCC00]/60 transition-colors"
              >
                {plate}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Section */}
      {loading ? (
        <div className="border border-steelLine bg-white rounded-2xl p-12 text-center text-steel shadow-2xs">
          <div className="inline-block w-7 h-7 border-3 border-amber border-t-transparent rounded-full animate-spin mb-3" />
          <p className="font-sign font-bold text-asphalt text-base">Fetching vehicle details from database...</p>
        </div>
      ) : searchedQuery && groupedVehicles.length === 0 ? (
        <div className="border-2 border-dashed border-steelLine bg-lane/20 rounded-2xl p-8 sm:p-12 text-center text-steel">
          <div className="w-14 h-14 rounded-full bg-asphalt/5 text-asphalt flex items-center justify-center mx-auto mb-3 text-2xl">
            🔍
          </div>
          <h3 className="font-sign font-bold text-asphalt text-xl mb-1">
            No Database Records Found for "{searchedQuery}"
          </h3>
          <p className="text-xs sm:text-sm text-steel max-w-md mx-auto mb-5">
            There are no past parking sessions or monthly passes logged in the system for this vehicle number.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/entry"
              className="bg-amber hover:bg-amberDim text-asphalt font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-colors"
            >
              + Create New Entry for {searchedQuery}
            </Link>
            <Link
              href="/passes"
              className="bg-asphalt hover:bg-asphalt2 text-lane font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-colors"
            >
              Issue Pass for {searchedQuery}
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedVehicles.map((vehicle) => {
            const insideSession = vehicle.sessions.find((s) => s.status === "inside");
            const activePass = vehicle.passes.find((p) => daysUntilExpiry(p.expiry_date) >= 0);
            const expiredPass = vehicle.passes.find((p) => daysUntilExpiry(p.expiry_date) < 0);
            const latestPass = activePass || expiredPass || vehicle.passes[0];

            const totalVisits = vehicle.sessions.length;
            const totalSpent = vehicle.sessions.reduce(
              (sum, s) => sum + Number(s.parking_amount || 0),
              0
            );

            const phone = vehicle.driverPhone;
            const driverName = vehicle.driverName || "Driver Not Specified";

            return (
              <div
                key={vehicle.vehicleNumber}
                className="bg-white border-2 border-steelLine rounded-2xl p-4 sm:p-6 shadow-sm space-y-5"
              >
                {/* Vehicle Header Card */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-steelLine">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Authentic Indian License Plate Badge */}
                    <div className="inline-flex items-center bg-[#FFCC00] text-black font-sign font-extrabold text-xl sm:text-2xl px-3.5 py-1.5 rounded-lg border-2 border-black shadow-sm tracking-wider">
                      <span className="text-[10px] font-sans font-extrabold mr-2 opacity-80 border-r border-black/30 pr-1.5">
                        IND
                      </span>
                      {vehicle.vehicleNumber}
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-steel uppercase">
                          Type: <strong className="text-asphalt">{vehicle.vehicleType}</strong>
                        </span>
                        {insideSession ? (
                          <span className="bg-[#E6F4EC] text-go border border-go/30 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-go animate-ping" />
                            PARKED INSIDE
                          </span>
                        ) : (
                          <span className="bg-lane text-steel border border-steelLine text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                            NOT PARKED INSIDE
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-asphalt mt-1">
                        👤 Driver: <strong>{driverName}</strong>
                        {phone && <span className="text-steel font-mono ml-2">📞 {phone}</span>}
                      </span>
                    </div>
                  </div>

                  {/* Driver Contact Buttons */}
                  {phone && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <a
                        href={telLink(phone)}
                        className="bg-asphalt hover:bg-asphalt2 text-lane text-xs font-bold px-3 py-2 rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                      >
                        📞 Call Driver
                      </a>
                      <a
                        href={waLink(
                          phone,
                          `Shambhu parking inquiry for vehicle ${vehicle.vehicleNumber}`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                      >
                        💬 WhatsApp
                      </a>
                      <a
                        href={smsLink(
                          phone,
                          `Shambhu parking notice for vehicle ${vehicle.vehicleNumber}`
                        )}
                        className="bg-[#007AFF] hover:bg-[#0062cc] text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                      >
                        ✉️ SMS
                      </a>
                    </div>
                  )}
                </div>

                {/* Key Status Highlights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Current Parking Box */}
                  <div
                    className={`p-4 rounded-xl border ${
                      insideSession
                        ? "bg-[#E6F4EC]/50 border-go/40"
                        : "bg-lane/40 border-steelLine/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-steel uppercase">Current Parking</span>
                      <span className="text-xs font-bold">{insideSession ? "🟢 Inside" : "⚪ Exited"}</span>
                    </div>

                    {insideSession ? (
                      <div className="space-y-2">
                        <div className="text-xs text-asphalt font-medium">
                          <div>Ticket: <strong className="font-mono">#{insideSession.ticket_number}</strong></div>
                          <div>Entered: <strong>{fmtTime(insideSession.entry_time)}</strong></div>
                          <div>Duration: <strong>{fmtDuration(insideSession.entry_time)}</strong></div>
                          <div>Est. Amount: <strong className="text-go text-sm">₹{insideSession.parking_amount}</strong></div>
                        </div>
                        <button
                          onClick={() => handleQuickExit(insideSession)}
                          disabled={exitProcessing === insideSession.id}
                          className="w-full bg-asphalt hover:bg-asphalt2 text-lane text-xs font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {exitProcessing === insideSession.id ? "Processing..." : "Process Exit"}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-steel mb-2.5">Vehicle is not currently inside the facility.</p>
                        <Link
                          href="/entry"
                          className="inline-block w-full text-center bg-amber hover:bg-amberDim text-asphalt text-xs font-bold py-2 rounded-lg transition-colors"
                        >
                          + Park Vehicle Now
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Monthly Pass Box */}
                  <div
                    className={`p-4 rounded-xl border ${
                      activePass
                        ? "bg-[#E6F4EC]/50 border-go/40"
                        : latestPass
                        ? "bg-[#FBEAE8]/50 border-stop/40"
                        : "bg-lane/40 border-steelLine/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-steel uppercase">Monthly Pass Status</span>
                      <span className="text-xs font-bold">
                        {activePass ? "🟢 Active" : latestPass ? "🔴 Expired" : "⚪ No Pass"}
                      </span>
                    </div>

                    {latestPass ? (
                      <div className="space-y-2 text-xs text-asphalt">
                        <div>Price: <strong>₹{latestPass.price}/month</strong></div>
                        <div>Issued: <strong>{latestPass.issued_date}</strong></div>
                        <div>Expiry: <strong>{latestPass.expiry_date}</strong></div>
                        <div>
                          Status:{" "}
                          <strong
                            className={
                              daysUntilExpiry(latestPass.expiry_date) < 0
                                ? "text-stop font-bold"
                                : "text-go font-bold"
                            }
                          >
                            {daysUntilExpiry(latestPass.expiry_date) < 0
                              ? `Expired ${Math.abs(daysUntilExpiry(latestPass.expiry_date))} day(s) ago`
                              : `Valid for ${daysUntilExpiry(latestPass.expiry_date)} more day(s)`}
                          </strong>
                        </div>
                        <button
                          onClick={() => renewPass(latestPass.id)}
                          className="w-full bg-amber hover:bg-amberDim text-asphalt text-xs font-bold py-2 rounded-lg transition-colors"
                        >
                          🔄 Renew Pass (30 Days)
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-steel mb-2.5">No monthly pass recorded for this vehicle.</p>
                        <Link
                          href="/passes"
                          className="inline-block w-full text-center bg-asphalt hover:bg-asphalt2 text-lane text-xs font-semibold py-2 rounded-lg transition-colors"
                        >
                          + Issue 30-Day Pass
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Stats Box */}
                  <div className="p-4 rounded-xl border border-steelLine/80 bg-lane/40 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-steel uppercase block mb-2">Lifetime Summary</span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2 rounded-lg border border-steelLine/60">
                          <span className="text-[10px] text-steel font-semibold block uppercase">Total Visits</span>
                          <span className="font-sign font-bold text-lg text-asphalt">{totalVisits}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-steelLine/60">
                          <span className="text-[10px] text-steel font-semibold block uppercase">Total Spent</span>
                          <span className="font-sign font-bold text-lg text-asphalt">₹{totalSpent}</span>
                        </div>
                      </div>
                    </div>

                    {vehicle.sessions.length > 0 && (
                      <div className="text-[11px] text-steel pt-2 border-t border-steelLine/40 mt-2">
                        First recorded visit: <strong>{fmtTimeShort(vehicle.sessions[vehicle.sessions.length - 1].entry_time)}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* All Sessions History Table */}
                <div>
                  <h4 className="font-sign font-bold text-base text-asphalt mb-3 flex items-center justify-between">
                    <span>Parking Sessions Database History ({vehicle.sessions.length})</span>
                  </h4>

                  {vehicle.sessions.length === 0 ? (
                    <p className="text-xs text-steel py-3 italic">No parking sessions logged for this vehicle yet.</p>
                  ) : (
                    <>
                      {/* Mobile Session Cards */}
                      <div className="grid grid-cols-1 gap-2.5 md:hidden">
                        {vehicle.sessions.map((s) => (
                          <div
                            key={s.id}
                            className="bg-lane/30 border border-steelLine rounded-xl p-3 text-xs space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-steel font-semibold">#{s.ticket_number}</span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  s.status === "inside" ? "bg-[#E6F4EC] text-go" : "bg-[#FBEAE8] text-stop"
                                }`}
                              >
                                {s.status === "inside" ? "Inside" : "Exited"}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] text-steel border-y border-dashed border-steelLine/60 py-1.5">
                              <div>
                                <span className="block text-[9px] uppercase font-bold">Entry</span>
                                <span className="font-semibold text-asphalt">{fmtTime(s.entry_time)}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] uppercase font-bold">Exit</span>
                                <span className="font-semibold text-asphalt">{s.exit_time ? fmtTime(s.exit_time) : "—"}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] uppercase font-bold">Amount</span>
                                <span className="font-semibold text-asphalt">₹{s.parking_amount} ({s.payment_method})</span>
                              </div>
                              <div>
                                <span className="block text-[9px] uppercase font-bold">Helmet</span>
                                <span className="font-semibold text-asphalt">{s.helmet ? "Yes 🪖" : "No"}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => setSelectedTicket(s)}
                              className="w-full border border-steelLine hover:border-asphalt bg-white text-asphalt font-semibold py-1.5 rounded-lg text-center transition-colors"
                            >
                              View Ticket Receipt
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table */}
                      <div className="hidden md:block border border-steelLine rounded-xl overflow-hidden bg-white shadow-2xs">
                        <table className="w-full text-xs sm:text-sm">
                          <thead>
                            <tr className="border-b border-steelLine text-steel text-xs uppercase tracking-wider bg-lane/60 text-left">
                              <th className="py-2.5 px-3">Ticket #</th>
                              <th className="py-2.5 px-3">Entry Time</th>
                              <th className="py-2.5 px-3">Exit Time</th>
                              <th className="py-2.5 px-3">Duration</th>
                              <th className="py-2.5 px-3">Amount</th>
                              <th className="py-2.5 px-3">Payment</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-steelLine">
                            {vehicle.sessions.map((s) => (
                              <tr key={s.id} className="hover:bg-lane/40 transition-colors">
                                <td className="py-2.5 px-3 font-mono text-steel">{s.ticket_number}</td>
                                <td className="py-2.5 px-3 text-asphalt font-medium">{fmtTime(s.entry_time)}</td>
                                <td className="py-2.5 px-3 text-steel">{s.exit_time ? fmtTime(s.exit_time) : "—"}</td>
                                <td className="py-2.5 px-3 text-steel">
                                  {s.exit_time
                                    ? `${Math.floor((s.duration_minutes ?? 0) / 60)}h ${
                                        (s.duration_minutes ?? 0) % 60
                                      }m`
                                    : fmtDuration(s.entry_time)}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-asphalt">₹{s.parking_amount}</td>
                                <td className="py-2.5 px-3 text-steel">{s.covered_by_pass ? "Pass" : s.payment_method}</td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block ${
                                      s.status === "inside" ? "bg-[#E6F4EC] text-go" : "bg-[#FBEAE8] text-stop"
                                    }`}
                                  >
                                    {s.status === "inside" ? "Inside" : "Exited"}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => setSelectedTicket(s)}
                                    className="border border-steelLine hover:border-asphalt hover:bg-lane text-asphalt text-xs font-semibold px-2.5 py-1 rounded transition-colors"
                                  >
                                    Receipt
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Selection Modal */}
      {selectedExitSession && (
        <PaymentModal
          session={selectedExitSession.session}
          amount={selectedExitSession.amount}
          processing={exitProcessing === selectedExitSession.session.id}
          onClose={() => setSelectedExitSession(null)}
          onConfirm={(method) => completeQuickExit(selectedExitSession.session, selectedExitSession.amount, method)}
        />
      )}

      {/* Ticket Modal */}
      {selectedTicket && (
        <div
          className="fixed inset-0 bg-asphalt/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto z-50 animate-fadeIn"
          onClick={(e) => e.target === e.currentTarget && setSelectedTicket(null)}
        >
          <TicketView session={selectedTicket} onClose={() => setSelectedTicket(null)} />
        </div>
      )}
    </div>
  );
}
