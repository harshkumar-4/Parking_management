"use client";

import { useState } from "react";
import type { ParkingSession } from "@/lib/types";
import { entryMessage, exitMessage, fmtTimeShort, smsLink, trackLink, waLink } from "@/lib/helpers";

export default function TicketView({ session, onClose }: { session: ParkingSession; onClose?: () => void }) {
  const isIn = session.status === "inside";
  const [copied, setCopied] = useState(false);
  const msg = isIn ? entryMessage(session) : exitMessage(session);

  function copyLink() {
    navigator.clipboard?.writeText(trackLink(session.public_token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white w-full max-w-[340px] sm:max-w-[360px] rounded-xl relative shadow-2xl overflow-hidden border border-steelLine/50 animate-scaleUp">
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close ticket modal"
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white text-sm z-10 flex items-center justify-center transition-colors active:scale-95"
        >
          ✕
        </button>
      )}
      
      {/* Header */}
      <div className="bg-asphalt text-lane px-5 py-4 rounded-t-xl pr-12">
        <div className="font-sign font-semibold text-base sm:text-[17px] tracking-wide text-lane">
          SHAMBHU CAR PARKING
        </div>
        <div className="text-[11px] text-[#9AA1AE] font-mono mt-0.5">
          Ticket #{session.ticket_number}
        </div>
      </div>

      <div className="perf" />

      {/* Ticket Details */}
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <Row k="Vehicle" v={session.vehicle_number} isVehicle />
        {session.helmet && session.vehicle_type === "Bike" && (
          <Row k="Helmet" v="Yes (+₹5/hr)" />
        )}
        <Row k="Driver" v={session.driver_name} />
        <Row k="Entry" v={fmtTimeShort(session.entry_time)} />

        {!isIn && session.exit_time && (
          <>
            <Row k="Exit" v={fmtTimeShort(session.exit_time)} />
            <Row
              k="Duration"
              v={`${Math.floor((session.duration_minutes ?? 0) / 60)}h ${(session.duration_minutes ?? 0) % 60}m`}
            />
          </>
        )}
        <Row k="Amount" v={`₹${session.parking_amount}`} />
        <Row k="Payment" v={session.covered_by_pass ? "Monthly Pass" : session.payment_method} last={!session.covered_by_pass} />
        {session.covered_by_pass && (
          <Row k="Pass Status" v="🎫 Covered by active pass" last />
        )}


        <div className={`text-center font-sign font-bold text-base pt-3.5 pb-1 ${isIn ? "text-go" : "text-stop"}`}>
          {isIn ? "🟢 VEHICLE INSIDE" : "🔴 VEHICLE EXITED"}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <a
            href={waLink(session.driver_phone, msg)}
            target="_blank"
            rel="noreferrer"
            className="text-center bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs py-2.5 px-2 rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1"
          >
            <span>💬 WhatsApp</span>
          </a>
          <a
            href={smsLink(session.driver_phone, msg)}
            className="text-center bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-2 rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-1"
          >
            <span>💬 Send SMS</span>
          </a>
        </div>
        <button
          onClick={copyLink}
          className="w-full mt-2 border border-steelLine hover:bg-lane text-asphalt font-semibold text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          {copied ? "✓ Link Copied!" : "Copy Public Link"}
        </button>

        <p className="text-center text-[11px] text-steel mt-3">
          Public tracking page — no login needed for driver.
        </p>
      </div>
    </div>
  );
}

function Row({ k, v, last, isVehicle }: { k: string; v: string; last?: boolean; isVehicle?: boolean }) {

  return (
    <div className={`flex justify-between items-center text-sm py-2 ${last ? "" : "border-b border-dotted border-steelLine"}`}>
      <span className="text-steel text-xs sm:text-sm">{k}</span>
      <span className={`font-semibold text-right ${isVehicle ? "font-sign text-base text-asphalt bg-amber/20 px-2 py-0.5 rounded border border-amber/40" : ""}`}>
        {v}
      </span>
    </div>
  );
}

