"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { ParkingPass, ParkingRate } from "@/lib/types";
import { daysUntilExpiry } from "@/lib/helpers";

export default function PassesPage() {
  const supabase = supabaseBrowser();
  const [passes, setPasses] = useState<ParkingPass[]>([]);
  const [rates, setRates] = useState<ParkingRate[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const todayStr = new Date().toISOString().split("T")[0];
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("");
  const [price, setPrice] = useState<number>(200);
  const [helmet, setHelmet] = useState(false);
  const [issuedDate, setIssuedDate] = useState(todayStr);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const { data: ratesData } = await supabase.from("parking_rates").select("*").eq("active", true);
    const r = (ratesData as ParkingRate[]) ?? [];
    setRates(r);
    
    if (r[0] && !type) {
      const initialType = r[0].vehicle_type;
      setType(initialType);
      updateDefaultPrice(initialType, false);
    }

    const { data: passesData } = await supabase.from("parking_passes").select("*");
    setPasses((passesData as ParkingPass[]) ?? []);
    setLoading(false);
  }

  function updateDefaultPrice(vehicleType: string, isHelmet: boolean) {
    if (vehicleType === "Bike") {
      setPrice(isHelmet ? 250 : 200);
    } else if (vehicleType === "Car") {
      setPrice(850);
    } else if (vehicleType === "Truck") {
      setPrice(2000);
    }
  }

  function onTypeChange(newType: string) {
    setType(newType);
    if (newType !== "Bike") setHelmet(false);
    updateDefaultPrice(newType, newType === "Bike" ? helmet : false);
  }

  function onHelmetChange(checked: boolean) {
    setHelmet(checked);
    if (type === "Bike") {
      updateDefaultPrice("Bike", checked);
    }
  }

  async function issuePass(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!vehicleNumber.trim()) {
      setError("Please enter a vehicle number.");
      return;
    }

    setSaving(true);
    const issued = new Date(issuedDate);
    const expiry = new Date(issued);
    expiry.setDate(expiry.getDate() + 30);
    const expiryStr = expiry.toISOString().split("T")[0];

    const { data, error: err } = await supabase
      .from("parking_passes")
      .insert({
        vehicle_number: vehicleNumber.trim().toUpperCase(),
        vehicle_type: type,
        driver_name: driverName.trim() || null,
        driver_phone: phone.trim() || null,
        price: Number(price),
        issued_date: issuedDate,
        expiry_date: expiryStr,
      })
      .select()
      .single();

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }

    if (data) {
      setPasses((prev) => [...prev, data as ParkingPass]);
      setVehicleNumber("");
      setDriverName("");
      setPhone("");
      setHelmet(false);
      if (rates[0]) {
        setType(rates[0].vehicle_type);
        updateDefaultPrice(rates[0].vehicle_type, false);
      }
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
      setPasses((prev) => prev.map((p) => (p.id === id ? (data as ParkingPass) : p)));
    }
  }

  async function removePass(id: string) {
    if (!window.confirm("Are you sure you want to remove this pass?")) return;
    setPasses((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("parking_passes").delete().eq("id", id);
  }

  async function updatePassPrice(id: string, newPrice: number) {
    setPasses((prev) => prev.map((p) => (p.id === id ? { ...p, price: newPrice } : p)));
    await supabase.from("parking_passes").update({ price: newPrice }).eq("id", id);
  }

  // Summary counts
  const expiredCount = useMemo(() => passes.filter((p) => daysUntilExpiry(p.expiry_date) < 0).length, [passes]);
  const expiringSoonCount = useMemo(
    () => passes.filter((p) => {
      const d = daysUntilExpiry(p.expiry_date);
      return d >= 0 && d <= 3;
    }).length,
    [passes]
  );

  // Sorted passes
  const sortedPasses = useMemo(() => {
    return [...passes].sort((a, b) => {
      const daysA = daysUntilExpiry(a.expiry_date);
      const daysB = daysUntilExpiry(b.expiry_date);

      const isExpA = daysA < 0;
      const isExpB = daysB < 0;
      const isSoonA = daysA >= 0 && daysA <= 3;
      const isSoonB = daysB >= 0 && daysB <= 3;

      // Group 1: Expired (longest overdue first -> most negative daysA first)
      if (isExpA && !isExpB) return -1;
      if (!isExpA && isExpB) return 1;
      if (isExpA && isExpB) return daysA - daysB;

      // Group 2: Expiring in 0-3 days (soonest first)
      if (isSoonA && !isSoonB) return -1;
      if (!isSoonA && isSoonB) return 1;
      if (isSoonA && isSoonB) return daysA - daysB;

      // Group 3: Active (soonest expiry first)
      return daysA - daysB;
    });
  }, [passes]);

  return (
    <div>
      <h2 className="font-sign font-semibold text-xl sm:text-2xl mb-0.5">Monthly Parking Passes</h2>
      <p className="text-steel text-xs sm:text-sm mb-5">Issue 30-day monthly passes for regular vehicles.</p>

      {/* Issue Pass Form */}
      <form onSubmit={issuePass} className="bg-white border border-steelLine rounded-xl p-4 sm:p-6 max-w-2xl shadow-sm mb-8">
        <h3 className="font-sign font-semibold text-base sm:text-lg mb-4 text-asphalt">Issue New Monthly Pass</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mb-3.5">
          <div>
            <label className="block text-xs font-semibold text-steel mb-1.5">Vehicle Number</label>
            <input
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g. GJ01AB1234"
              className="w-full px-3.5 py-2.5 border border-steelLine rounded-lg text-base sm:text-sm bg-white uppercase tracking-wider font-semibold font-sign focus:outline-none focus:ring-2 focus:ring-amber"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-steel mb-1.5">Driver Name</label>
            <input
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Driver name"
              className="w-full px-3.5 py-2.5 border border-steelLine rounded-lg text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mb-3.5">
          <div>
            <label className="block text-xs font-semibold text-steel mb-1.5">WhatsApp Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={10}
              placeholder="10-digit mobile number"
              className="w-full px-3.5 py-2.5 border border-steelLine rounded-lg text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber"
              type="tel"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-steel mb-1.5">Vehicle Type</label>
            <select
              value={type}
              onChange={(e) => onTypeChange(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-steelLine rounded-lg text-base sm:text-sm bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber"
            >
              {rates.map((r) => (
                <option key={r.id} value={r.vehicle_type}>{r.vehicle_type}</option>
              ))}
            </select>
          </div>
        </div>

        {type === "Bike" && (
          <div className="mb-3.5 flex items-center gap-2">
            <input
              type="checkbox"
              id="passHelmet"
              checked={helmet}
              onChange={(e) => onHelmetChange(e.target.checked)}
              className="w-4 h-4 accent-amber cursor-pointer"
            />
            <label htmlFor="passHelmet" className="text-xs sm:text-sm font-semibold text-asphalt cursor-pointer">
              🪖 Include Helmet Storage (+₹50/month)
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-steel mb-1.5">Pass Price (₹)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 border border-steelLine rounded-lg text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-steel mb-1.5">Issued Date</label>
            <input
              type="date"
              value={issuedDate}
              onChange={(e) => setIssuedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-steelLine rounded-lg text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber"
              required
            />
          </div>
        </div>

        {error && <p className="text-stop text-xs font-semibold mb-3 bg-stop/10 border border-stop/20 p-2.5 rounded-md">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-amber hover:bg-amberDim text-asphalt font-bold text-base py-3 rounded-lg shadow-sm transition-transform active:scale-[0.99] disabled:opacity-50"
        >
          {saving ? "Issuing Pass…" : "Issue 30-Day Pass"}
        </button>
      </form>

      {/* Summary Lines */}
      <div className="space-y-1 mb-4">
        {expiredCount > 0 && (
          <p className="text-xs sm:text-sm font-semibold text-stop">
            ⚠️ {expiredCount} pass(es) expired — renewal needed
          </p>
        )}
        {expiringSoonCount > 0 && (
          <p className="text-xs sm:text-sm font-semibold text-amberDim">
            ⏳ {expiringSoonCount} pass(es) expiring within 3 days
          </p>
        )}
      </div>

      {/* Passes Table / List */}
      <div className="bg-white border border-steelLine rounded-xl p-4 sm:p-6 shadow-sm">
        <h3 className="font-sign font-semibold text-lg mb-4 text-asphalt">Active & Expired Passes</h3>

        {loading ? (
          <p className="text-steel text-sm py-4 text-center">Loading passes…</p>
        ) : sortedPasses.length === 0 ? (
          <p className="text-steel text-sm py-4 text-center">No monthly passes issued yet.</p>
        ) : (
          <>
            {/* Mobile Card List (< sm) */}
            <div className="grid grid-cols-1 gap-3 sm:hidden">
              {sortedPasses.map((p) => {
                const days = daysUntilExpiry(p.expiry_date);
                return (
                  <div key={p.id} className="border border-steelLine rounded-lg p-3.5 bg-lane/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-sign font-bold text-base text-asphalt bg-amber/20 border border-amber/40 px-2 py-0.5 rounded">
                        {p.vehicle_number}
                      </span>
                      <StatusBadge days={days} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-steel border-y border-dashed border-steelLine/60 py-2">
                      <div>
                        <span className="block text-[10px] uppercase text-steel/70">Type</span>
                        <span className="font-semibold text-asphalt text-xs">{p.vehicle_type}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-steel/70">Price</span>
                        <input
                          type="number"
                          defaultValue={p.price}
                          onBlur={(e) => updatePassPrice(p.id, Number(e.target.value))}
                          className="w-20 px-1.5 py-0.5 border border-steelLine rounded text-xs bg-white"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-steel/70">Issued</span>
                        <span className="font-semibold text-asphalt text-xs">{p.issued_date}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-steel/70">Expiry</span>
                        <span className="font-semibold text-asphalt text-xs">{p.expiry_date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => renewPass(p.id)}
                        className="flex-1 bg-amber hover:bg-amberDim text-asphalt text-xs font-bold py-1.5 rounded transition-colors text-center"
                      >
                        Renew (30 Days)
                      </button>
                      <button
                        onClick={() => removePass(p.id)}
                        className="border border-stop/30 hover:border-stop text-stop text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= sm) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-asphalt text-left text-steel text-xs bg-lane">
                    <th className="py-2.5 px-3">Vehicle</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Price (₹)</th>
                    <th className="py-2.5 px-3">Issued</th>
                    <th className="py-2.5 px-3">Expiry</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steelLine">
                  {sortedPasses.map((p) => {
                    const days = daysUntilExpiry(p.expiry_date);
                    return (
                      <tr key={p.id} className="hover:bg-lane/50 transition-colors">
                        <td className="py-3 px-3 font-sign font-semibold text-base">{p.vehicle_number}</td>
                        <td className="py-3 px-3">{p.vehicle_type}</td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            defaultValue={p.price}
                            onBlur={(e) => updatePassPrice(p.id, Number(e.target.value))}
                            className="w-20 px-2 py-1 border border-steelLine rounded text-sm bg-white"
                          />
                        </td>
                        <td className="py-3 px-3 text-xs">{p.issued_date}</td>
                        <td className="py-3 px-3 text-xs font-semibold">{p.expiry_date}</td>
                        <td className="py-3 px-3">
                          <StatusBadge days={days} />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => renewPass(p.id)}
                              className="bg-amber hover:bg-amberDim text-asphalt text-xs font-bold px-3 py-1.5 rounded transition-colors"
                            >
                              Renew
                            </button>
                            <button
                              onClick={() => removePass(p.id)}
                              className="border border-stop/30 hover:border-stop text-stop text-xs font-semibold px-2.5 py-1.5 rounded transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className="bg-[#FBEAE8] text-stop text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block">
        Expired {Math.abs(days)} day(s) ago
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="bg-amber/20 text-amberDim text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block">
        {days === 0 ? "Expires today" : `Expires in ${days} day(s)`}
      </span>
    );
  }
  return (
    <span className="bg-[#E6F4EC] text-go text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block">
      Active
    </span>
  );
}
