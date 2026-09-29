"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { ParkingSession } from "@/lib/types";
import { fmtTimeShort } from "@/lib/helpers";

export default function PublicTicketPage({ params }: { params: { token: string } }) {
  const supabase = supabaseBrowser();
  const [session, setSession] = useState<ParkingSession | null | undefined>(undefined);

  useEffect(() => {
    supabase.from("parking_sessions").select("*").eq("public_token", params.token).maybeSingle().then(({ data }) => {
      setSession((data as ParkingSession) ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  if (session === undefined) return <div className="min-h-screen bg-asphalt" />;
  if (session === null) {
    return (
      <div className="min-h-screen bg-asphalt flex items-center justify-center p-4">
        <div className="bg-white/10 text-lane border border-white/15 rounded-xl p-6 text-center max-w-sm">
          <p className="font-sign font-semibold text-lg mb-1">Ticket not found</p>
          <p className="text-steel text-xs">Please check the link and try again.</p>
        </div>
      </div>
    );
  }

  const isIn = session.status === "inside";

  return (
    <div className="min-h-screen bg-asphalt flex items-center justify-center p-4 sm:p-8">
      <div className="bg-white w-full max-w-[340px] sm:max-w-[360px] rounded-xl shadow-2xl overflow-hidden border border-white/10 my-auto">
        <div className="bg-asphalt text-lane px-5 py-4 rounded-t-xl">
          <div className="font-sign font-semibold text-base sm:text-[17px] tracking-wide text-lane">
            SHAMBHU CAR PARKING
          </div>
          <div className="text-[11px] text-[#9AA1AE] font-mono mt-0.5">
            Ticket #{session.ticket_number}
          </div>
        </div>

        <div className="perf" />

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <Row k="Vehicle" v={session.vehicle_number} isVehicle />
          {session.helmet && session.vehicle_type === "Bike" && (
            <Row k="Helmet" v="Yes (+₹5/hr)" />
          )}
          <Row k="Entry" v={fmtTimeShort(session.entry_time)} />

          {!isIn && session.exit_time && <Row k="Exit" v={fmtTimeShort(session.exit_time)} />}
          <Row k="Amount" v={`₹${session.parking_amount}`} />
          <Row k="Payment" v={session.covered_by_pass ? "Monthly Pass" : session.payment_method} last={!session.covered_by_pass} />
          {session.covered_by_pass && (
            <Row k="Pass Status" v="🎫 Covered by active pass" last />
          )}


          <div className={`text-center font-sign font-bold text-base pt-4 ${isIn ? "text-go" : "text-stop"}`}>
            {isIn ? "🟢 VEHICLE INSIDE" : "🔴 VEHICLE EXITED"}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, last, isVehicle }: { k: string; v: string; last?: boolean; isVehicle?: boolean }) {
  return (
    <div className={`flex justify-between items-center text-sm py-2.5 ${last ? "" : "border-b border-dotted border-steelLine"}`}>
      <span className="text-steel text-xs sm:text-sm">{k}</span>
      <span className={`font-semibold text-right ${isVehicle ? "font-sign text-base text-asphalt bg-amber/20 px-2 py-0.5 rounded border border-amber/40" : ""}`}>
        {v}
      </span>
    </div>
  );
}

