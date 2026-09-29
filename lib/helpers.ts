import type { ParkingRate, ParkingSession, ParkingPass } from "./types";

export function rateFor(rates: ParkingRate[], type: string) {
  return rates.find((r) => r.vehicle_type === type) ?? rates[0];
}

export function calcAmount(rates: ParkingRate[], type: string, entryISO: string, exitISO: string) {
  const r = rateFor(rates, type);
  const mins = Math.max(1, Math.round((new Date(exitISO).getTime() - new Date(entryISO).getTime()) / 60000));
  const slabMins = (r?.duration_hours ?? 1) * 60;
  const slabs = Math.ceil(mins / slabMins);
  return { amount: slabs * (r?.rate ?? 0), duration: mins };
}

export function genTicketNo() {
  return "SCP" + Date.now().toString().slice(-6);
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

export function fmtTimeShort(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function fmtDuration(entryISO: string) {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(entryISO).getTime()) / 60000));
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${remainingMins}m`;
}

export function waLink(phone: string, msg: string) {
  const clean = (phone || "").replace(/\D/g, "");
  const withCc = clean.length === 10 ? "91" + clean : clean;
  return `https://wa.me/${withCc}?text=${encodeURIComponent(msg)}`;
}

export function smsLink(phone: string, msg: string) {
  const clean = (phone || "").replace(/\D/g, "");
  return `sms:${clean}?body=${encodeURIComponent(msg)}`;
}

export function trackLink(token: string) {
  if (typeof window === "undefined") return `/ticket/${token}`;
  return `${window.location.origin}/ticket/${token}`;
}


export function entryMessage(s: ParkingSession) {
  return `Shambhu parking and washing centre\nVehicle: ${s.vehicle_number}\nEntry: ${fmtTimeShort(s.entry_time)}\nAmount: ₹${s.parking_amount}\nPayment: Cash\nStatus: 🟢 Inside\nTrack: ${trackLink(s.public_token)}`;
}

export function exitMessage(s: ParkingSession) {
  return `Shambhu parking and washing centre\nVehicle: ${s.vehicle_number}\nEntry: ${fmtTimeShort(s.entry_time)}\nExit: ${fmtTimeShort(s.exit_time!)}\nParking: ₹${s.parking_amount}\nPayment: Cash\nStatus: 🔴 Exited\nDetails: ${trackLink(s.public_token)}`;
}

export function isPassActive(p: { expiry_date: string }) {
  return new Date(p.expiry_date) >= new Date(new Date().toDateString());
}

export function daysUntilExpiry(expiry_date: string) {
  const diff = new Date(expiry_date).getTime() - new Date(new Date().toDateString()).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function passMessage(p: ParkingPass) {
  const days = daysUntilExpiry(p.expiry_date);
  let statusText = "🟢 Active";
  if (days < 0) statusText = `🔴 Expired ${Math.abs(days)} day(s) ago`;
  else if (days <= 2) statusText = `⚠️ Expires ${days === 0 ? "today" : "in " + days + " day(s)"}`;

  return `Shambhu parking and washing centre\n🎫 Monthly Pass Details\nVehicle: ${p.vehicle_number}\nType: ${p.vehicle_type}\nDriver: ${p.driver_name || "N/A"}\nIssued: ${p.issued_date}\nExpiry: ${p.expiry_date}\nPrice: ₹${p.price}\nStatus: ${statusText}`;
}

export function telLink(phone: string) {
  const clean = (phone || "").replace(/\D/g, "");
  return `tel:${clean}`;
}




