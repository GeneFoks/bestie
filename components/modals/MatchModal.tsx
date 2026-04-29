"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { ACTIVITY_TYPES } from "@/types";

export default function MatchModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    activity_type: "",
    city: "",
    date: "",
    time: "12:00",
    notes: "",
  });

  const handleSubmit = () => {
    // TODO: connect to Supabase
    console.log("Match request:", form);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card border border-gold/20 rounded-2xl p-10 w-full max-w-lg mx-4 relative animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-white/5 transition-colors"
        >
          <X size={18} />
        </button>

        <h2 className="font-serif text-3xl text-gold mb-1">Smart Match Request</h2>
        <p className="text-muted text-sm mb-7">
          Tell us what you're looking for. We'll surface the best Besties for you.
        </p>

        <div className="space-y-4">
          <div>
            <label className="label-base">Activity type</label>
            <select
              className="input-base"
              value={form.activity_type}
              onChange={(e) => setForm({ ...form, activity_type: e.target.value })}
            >
              <option value="">Choose an activity</option>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-base">City or location</label>
            <input
              type="text"
              className="input-base"
              placeholder="e.g. Austin, TX"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>

          <div>
            <label className="label-base">Preferred date & time</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className="input-base"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <input
                type="time"
                className="input-base"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label-base">Preferences or notes</label>
            <textarea
              className="input-base resize-none min-h-[80px]"
              placeholder="Anything we should know? Vibe, interests, accessibility needs…"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-7">
          <button onClick={onClose} className="btn-outline">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn-gold">
            Find My Bestie
          </button>
        </div>
      </div>
    </div>
  );
}
