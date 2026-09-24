"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { ParkingSession } from "@/lib/types";
import { fmtTime } from "@/lib/helpers";
import TicketView from "@/components/TicketView";

export default function HistoryPage() {
  const supabase = supabaseBrowser();
  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [query, setQuery] = useState("");
  const [ticket, setTicket] = useState<ParkingSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("parking_sessions").select("*").order("entry_time", { ascending: false }).limit(200).then(({ data }) => {
      setSessions((data as ParkingSession[]) ?? []);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) => s.vehicle_number.toLowerCase().includes(q) || s.ticket_number.toLowerCase().includes(q) || fmtTime(s.entry_time).toLowerCase().includes(q)
    );
  }, [sessions, query]);

  return (
    <div>
      <h2 className="font-sign font-semibold text-xl sm:text-2xl mb-0.5">Parking history</h2>
      <p className="text-steel text-xs sm:text-sm mb-5">Search by vehicle number, ticket number, or date.</p>

      {/* Search Input */}
      <div className="relative mb-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search vehicle, ticket, or date (e.g. Sep 22)…"
          className="w-full px-3.5 py-2.5 border border-steelLine rounded-lg text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber transition-all shadow-sm"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-asphalt text-xs px-1.5 py-0.5"
          >
            ✕
          </button>
        )}
      </div>

      {loading ? (
        <div className="border border-steelLine rounded-xl p-8 text-center text-steel bg-white">
          <p className="text-sm">Loading history records…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-steelLine rounded-xl p-8 sm:p-10 text-center text-steel bg-white">
          <p className="font-sign font-semibold text-asphalt text-base sm:text-[17px] mb-1">No records found</p>
          <p className="text-xs sm:text-sm">Try a different vehicle number or date.</p>
        </div>
      ) : (
        <>
          {/* Mobile Card List View (< md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="bg-white border border-steelLine rounded-xl p-4 shadow-sm flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-sign font-bold text-base text-asphalt bg-amber/20 border border-amber/40 px-2 py-0.5 rounded">
                      {s.vehicle_number}
                    </span>
                    <span className="text-[11px] text-steel font-mono">#{s.ticket_number}</span>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${s.status === "inside" ? "bg-[#E6F4EC] text-go" : "bg-[#FBEAE8] text-stop"}`}>
                    {s.status === "inside" ? "Inside" : "Exited"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-steel border-y border-dashed border-steelLine/60 py-2">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-steel/70">Entry</span>
                    <span className="font-semibold text-asphalt text-xs block">{fmtTime(s.entry_time)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-steel/70">Exit</span>
                    <span className="font-semibold text-asphalt text-xs block">{s.exit_time ? fmtTime(s.exit_time) : "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-steel/70">Amount</span>
                    <span className="font-semibold text-asphalt text-xs block">{s.status === "exited" ? `₹${s.parking_amount}` : "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-steel/70">Driver</span>
                    <span className="font-semibold text-asphalt text-xs truncate block">{s.driver_name || "—"}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-0.5">
                  <button
                    onClick={() => setTicket(s)}
                    className="w-full border border-steelLine hover:border-asphalt text-asphalt text-xs font-semibold px-4 py-2 rounded-lg bg-lane transition-colors text-center"
                  >
                    View Ticket Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block border border-steelLine rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-asphalt text-left text-steel text-xs bg-lane">
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Entry</th>
                    <th className="py-3 px-4">Exit</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steelLine">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-lane/50 transition-colors">
                      <td className="py-3 px-4 text-xs font-mono text-steel">{s.ticket_number}</td>
                      <td className="py-3 px-4 font-sign font-semibold text-base">{s.vehicle_number}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{fmtTime(s.entry_time)}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{s.exit_time ? fmtTime(s.exit_time) : "—"}</td>
                      <td className="py-3 px-4 font-semibold">{s.status === "exited" ? `₹${s.parking_amount}` : "—"}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[11.5px] font-bold px-2.5 py-0.5 rounded-full inline-block ${s.status === "inside" ? "bg-[#E6F4EC] text-go" : "bg-[#FBEAE8] text-stop"}`}>
                          {s.status === "inside" ? "Inside" : "Exited"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setTicket(s)}
                          className="border border-steelLine hover:bg-lane text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                        >
                          Ticket
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Ticket Modal */}
      {ticket && (
        <div
          className="fixed inset-0 bg-asphalt/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto z-50 animate-fadeIn"
          onClick={(e) => e.target === e.currentTarget && setTicket(null)}
        >
          <TicketView session={ticket} onClose={() => setTicket(null)} />
        </div>
      )}
    </div>
  );
}

