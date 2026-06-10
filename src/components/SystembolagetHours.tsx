"use client";

import { useEffect, useState } from "react";

const TZ = "Europe/Stockholm";

const DEFAULT_HOURS = {
  weekday: { open: "10:00", close: "19:00" },
  saturday: { open: "10:00", close: "15:00" },
  sunday: { closed: true as const },
};

const SPECIAL_DAYS: Record<string, { closed?: boolean; open?: string; close?: string; label?: string }> = {
  "2026-05-01": { closed: true, label: "Första maj" },
  "2026-05-14": { closed: true, label: "Kristi himmelsfärd" },
  "2026-06-06": { closed: true, label: "Nationaldagen" },
  "2026-06-19": { closed: true, label: "Midsommarafton" },
  "2026-06-20": { closed: true, label: "Midsommardagen" },
  "2026-10-31": { closed: true, label: "Alla helgons dag" },
  "2026-12-24": { closed: true, label: "Julafton" },
  "2026-12-25": { closed: true, label: "Juldagen" },
  "2026-12-26": { closed: true, label: "Annandagen" },
  "2026-12-31": { open: "10:00", close: "15:00", label: "Nyårsafton" },
  "2027-01-01": { closed: true, label: "Nyårsdagen" },
  "2027-01-06": { closed: true, label: "Trettondagen" },
};

const WEEKDAY_LABELS = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];

function getTimeParts(date: Date) {
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const vals: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) if (p.type !== "literal") vals[p.type] = p.value;
  return vals;
}

function dateKey(date: Date) {
  const p = getTimeParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

function minutesNow(date: Date) {
  const p = getTimeParts(date);
  return parseInt(p.hour) * 60 + parseInt(p.minute);
}

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatLeft(mins: number) {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function weekdayIndex(key: string) {
  const [y, mo, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 12)).getUTCDay();
}

function keyOffset(date: Date, offset: number) {
  const p = getTimeParts(date);
  const utc = new Date(Date.UTC(parseInt(p.year), parseInt(p.month) - 1, parseInt(p.day) + offset, 12));
  return dateKey(utc);
}

type Schedule =
  | { closed: true; label?: string }
  | { open: string; close: string; label?: string };

function scheduleFor(key: string): Schedule {
  const special = SPECIAL_DAYS[key];
  if (special) {
    if (special.closed) return { closed: true, label: special.label };
    if (special.open && special.close) return { open: special.open, close: special.close, label: special.label };
  }
  const wd = weekdayIndex(key);
  if (wd === 0) return DEFAULT_HOURS.sunday;
  if (wd === 6) return DEFAULT_HOURS.saturday;
  return DEFAULT_HOURS.weekday;
}

function findNextOpen(date: Date) {
  for (let i = 1; i <= 7; i++) {
    const key = keyOffset(date, i);
    const sched = scheduleFor(key);
    if (!("closed" in sched)) return { key, sched, offset: i };
  }
  return null;
}

interface BolagetStatus {
  isOpen: boolean;
  hoursText: string;
  statusText: string;
  color: string;
  glow: string;
}

function computeStatus(): BolagetStatus {
  const now = new Date();
  const key = dateKey(now);
  const sched = scheduleFor(key);
  const nowMin = minutesNow(now);

  const next = findNextOpen(now);
  const nextLabel = next
    ? next.offset === 1
      ? "imorgon"
      : WEEKDAY_LABELS[weekdayIndex(next.key)]
    : null;
  const nextHoursText = next
    ? `Öppnar ${nextLabel} ${(next.sched as { open: string; close: string }).open}–${(next.sched as { open: string; close: string }).close}`
    : "Öppettider saknas";

  if ("closed" in sched) {
    return { isOpen: false, hoursText: nextHoursText, statusText: "Stängt", color: "rgb(239,68,68)", glow: "rgba(239,68,68,0.45)" };
  }

  const openMin = toMin(sched.open);
  const closeMin = toMin(sched.close);

  if (nowMin < openMin) {
    return { isOpen: false, hoursText: `Öppnar idag ${sched.open}–${sched.close}`, statusText: "Stängt", color: "rgb(239,68,68)", glow: "rgba(239,68,68,0.35)" };
  }

  if (nowMin >= closeMin) {
    return { isOpen: false, hoursText: nextHoursText, statusText: "Stängt", color: "rgb(239,68,68)", glow: "rgba(239,68,68,0.45)" };
  }

  const left = closeMin - nowMin;
  let color: string, glow: string;
  if (left <= 60) {
    const t = Math.min(1, (60 - left) / 60);
    const r = Math.round(245 + (239 - 245) * t);
    const g = Math.round(158 + (68 - 158) * t);
    const b = Math.round(11 + (68 - 11) * t);
    color = `rgb(${r},${g},${b})`;
    glow = `rgba(${r},${g},${b},0.45)`;
  } else {
    color = "rgb(58,123,213)";
    glow = "rgba(58,123,213,0.35)";
  }

  return { isOpen: true, hoursText: `Idag ${sched.open}–${sched.close}`, statusText: `Stänger om ${formatLeft(left)}`, color, glow };
}

export function SystembolagetHours() {
  const [status, setStatus] = useState<BolagetStatus | null>(null);

  useEffect(() => {
    setStatus(computeStatus());
    const id = setInterval(() => setStatus(computeStatus()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!status) return null;

  return (
    <div
      className="inline-flex items-center gap-3 rounded-full px-5 py-2 text-sm"
      style={{
        background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(236,72,153,0.08))",
        border: "1px solid rgba(139,92,246,0.25)",
        boxShadow: "0 0 24px rgba(139,92,246,0.2), 0 0 48px rgba(139,92,246,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
        style={{ backgroundColor: status.color, boxShadow: `0 0 6px ${status.glow}` }}
      />
      <span className="text-white/60">Systembolaget</span>
      <span className="hidden sm:inline text-white/20">·</span>
      <span className="hidden sm:inline font-semibold text-purple-300">{status.hoursText}</span>
      <span className="text-white/20">·</span>
      <span className="font-semibold" style={{ color: status.color }}>{status.statusText}</span>
    </div>
  );
}
