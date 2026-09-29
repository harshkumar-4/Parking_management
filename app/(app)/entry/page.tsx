"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { ParkingPass, ParkingRate, ParkingSession } from "@/lib/types";
import { genTicketNo, isPassActive, rateFor } from "@/lib/helpers";
import TicketView from "@/components/TicketView";

export default function EntryPage() {
  const supabase = supabaseBrowser();
  const [rates, setRates] = useState<ParkingRate[]>([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("");
  const [rate, setRate] = useState(0);
  const [helmet, setHelmet] = useState(false);
  const [activePass, setActivePass] = useState<ParkingPass | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<ParkingSession | null>(null);

  useEffect(() => {
    supabase.from("parking_rates").select("*").eq("active", true).then(({ data }) => {
      const r = (data as ParkingRate[]) ?? [];
      setRates(r);
      if (r[0]) { setType(r[0].vehicle_type); setRate(r[0].rate); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = vehicleNumber.trim().toUpperCase();
    if (!v) {
      setActivePass(null);
      return;
    }
    supabase
      .from("parking_passes")
      .select("*")
      .eq("vehicle_number", v)
      .then(({ data }) => {
        const passes = (data as ParkingPass[]) ?? [];
        const active = passes.find((p) => isPassActive(p));
        setActivePass(active ?? null);
      });
  }, [vehicleNumber]);

  function onTypeChange(t: string) {
    setType(t);
    if (t !== "Bike") {
      setHelmet(false);
    }
    const r = rateFor(rates, t);
    if (r) setRate(r.rate);
  }

  async function submit() {
    setError("");
    if (!vehicleNumber.trim() || !driverName.trim() || phone.replace(/\D/g, "").length < 10) {
      setError("Enter vehicle number, driver name, and a valid 10-digit number.");
      return;
    }
    setSaving(true);
    const isCovered = Boolean(activePass);
    const finalRate = isCovered ? 0 : ((type === "Bike" && helmet) ? rate + 5 : rate);
    const paymentMethod = isCovered ? "Pass" : "Cash";

    const { data, error } = await supabase
      .from("parking_sessions")
      .insert({
        ticket_number: genTicketNo(),
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        vehicle_type: type,
        driver_name: driverName.trim(),
        driver_phone: phone.trim(),
        parking_amount: finalRate,
        payment_method: paymentMethod,
        status: "inside",
        helmet: helmet,
        covered_by_pass: isCovered,
      })
      .select()
      .single();
    setSaving(false);
    if (error) { setError(error.message); return; }
    setCreated(data as ParkingSession);
    setVehicleNumber(""); setDriverName(""); setPhone(""); setHelmet(false); setActivePass(null);
  }



  return (
    <div>
      <h2 className="font-sign font-semibold text-xl sm:text-2xl mb-0.5">Vehicle entry</h2>
      <p className="text-steel text-xs sm:text-sm mb-5">Vehicle arrives → fill details → VEHICLE IN.</p>

      <div className="bg-white border border-steelLine rounded-xl p-4 sm:p-6 max-w-lg shadow-sm">
        <Field label="Vehicle number">
          <input
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            placeholder="e.g. GJ01AB1234"
            className="input uppercase tracking-wider font-semibold font-sign"
          />
        </Field>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <Field label="Driver name">
            <input
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Driver name"
              className="input"
            />
          </Field>
          <Field label="WhatsApp number">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={10}
              placeholder="10-digit mobile number"
              className="input"
              type="tel"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <Field label="Vehicle type">
            <select
              value={type}
              onChange={(e) => onTypeChange(e.target.value)}
              className="input bg-white cursor-pointer"
            >
              {rates.map((r) => (
                <option key={r.id} value={r.vehicle_type}>{r.vehicle_type}</option>
              ))}
            </select>
          </Field>
          <Field label="Parking rate (₹)">
            <input
              type={activePass ? "text" : "number"}
              value={activePass ? "Free — Active Pass" : ((type === "Bike" && helmet) ? rate + 5 : rate)}
              readOnly
              disabled
              className="input bg-gray-100 text-steel cursor-not-allowed font-semibold"
            />
            <p className="text-[11px] text-steel -mt-2.5 mb-3.5">
              {activePass ? "Covered by active monthly pass" : "Auto-calculated from vehicle type and helmet status"}
            </p>
          </Field>
        </div>

        {type === "Bike" && (
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="helmet"
              checked={helmet}
              onChange={(e) => setHelmet(e.target.checked)}
              className="w-4 h-4 accent-amber cursor-pointer"
            />
            <label htmlFor="helmet" className="text-xs sm:text-sm font-semibold text-asphalt cursor-pointer">
              🪖 Helmet provided (+₹5/hr)
            </label>
          </div>
        )}

        {activePass && (
          <div className="mb-4 p-3 bg-go/10 border border-go/30 rounded-lg text-go font-semibold text-xs sm:text-sm">
            🎫 Active monthly pass — valid until {activePass.expiry_date}. This entry is free.
          </div>
        )}

        {error && <p className="text-stop text-xs font-semibold mb-3.5 bg-stop/10 border border-stop/20 p-2.5 rounded-md">{error}</p>}
        
        <button
          onClick={submit}
          disabled={saving}
          className="w-full bg-amber hover:bg-amberDim text-asphalt font-bold text-base py-3.5 rounded-lg shadow-sm transition-transform active:scale-[0.99] disabled:opacity-50 mt-1"
        >
          {saving ? "Saving…" : "VEHICLE IN"}
        </button>

      </div>

      {created && (
        <div
          className="fixed inset-0 bg-asphalt/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto z-50 animate-fadeIn"
          onClick={(e) => e.target === e.currentTarget && setCreated(null)}
        >
          <TicketView session={created} onClose={() => setCreated(null)} />
        </div>
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid #DADCE0;
          border-radius: 8px;
          font-size: 16px;
          margin-bottom: 14px;
          background-color: #ffffff;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .input:focus {
          outline: none;
          border-color: #F5A623;
          box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.25);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-steel mb-1.5">{label}</label>
      {children}
    </div>
  );
}

