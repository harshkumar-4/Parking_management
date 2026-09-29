"use client";

import { useState } from "react";
import type { ParkingSession } from "@/lib/types";

export default function PaymentModal({
  session,
  amount,
  onConfirm,
  onClose,
  processing,
}: {
  session: ParkingSession;
  amount: number;
  onConfirm: (method: "Cash" | "Paytm") => void;
  onClose: () => void;
  processing: boolean;
}) {
  const [method, setMethod] = useState<"Cash" | "Paytm">("Cash");

  return (
    <div
      className="fixed inset-0 bg-asphalt/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto z-50 animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-[360px] rounded-xl shadow-2xl p-5 sm:p-6 border border-steelLine/50 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-asphalt/10 hover:bg-asphalt/20 text-asphalt text-sm flex items-center justify-center transition-colors"
        >
          ✕
        </button>

        <h3 className="font-sign font-semibold text-lg text-asphalt mb-1">Select Payment Method</h3>
        <p className="text-steel text-xs mb-4">Choose how the driver is paying for this parking session.</p>

        {/* Vehicle & Amount Card */}
        <div className="bg-lane/60 border border-steelLine rounded-lg p-3 mb-5 flex items-center justify-between">
          <div>
            <span className="font-sign font-bold text-base text-asphalt bg-amber/20 border border-amber/40 px-2 py-0.5 rounded">
              {session.vehicle_number}
            </span>
            <span className="block text-[11px] text-steel mt-1">{session.vehicle_type}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-steel uppercase font-semibold block">Total Amount</span>
            <span className="font-sign font-bold text-2xl text-asphalt">₹{amount}</span>
          </div>
        </div>

        {/* Payment Options */}
        <div className="space-y-2.5 mb-6">
          <label
            onClick={() => setMethod("Cash")}
            className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
              method === "Cash"
                ? "border-amber bg-amber/10 shadow-xs"
                : "border-steelLine hover:border-steel"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">💵</span>
              <div>
                <span className="font-bold text-sm text-asphalt block">Cash Payment</span>
                <span className="text-[11px] text-steel block">Physical cash collected</span>
              </div>
            </div>
            <input
              type="radio"
              name="paymentMethod"
              checked={method === "Cash"}
              onChange={() => setMethod("Cash")}
              className="w-4 h-4 accent-amber cursor-pointer"
            />
          </label>

          <label
            onClick={() => setMethod("Paytm")}
            className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
              method === "Paytm"
                ? "border-amber bg-amber/10 shadow-xs"
                : "border-steelLine hover:border-steel"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📱</span>
              <div>
                <span className="font-bold text-sm text-asphalt block">Paytm / UPI</span>
                <span className="text-[11px] text-steel block">Digital wallet or QR scan</span>
              </div>
            </div>
            <input
              type="radio"
              name="paymentMethod"
              checked={method === "Paytm"}
              onChange={() => setMethod("Paytm")}
              className="w-4 h-4 accent-amber cursor-pointer"
            />
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 border border-steelLine hover:bg-lane text-asphalt font-semibold text-sm py-3 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(method)}
            disabled={processing}
            className="flex-1 bg-amber hover:bg-amberDim text-asphalt font-bold text-sm py-3 rounded-lg shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {processing ? "Processing…" : `Confirm (${method})`}
          </button>
        </div>
      </div>
    </div>
  );
}
