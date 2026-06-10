"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface WheelProduct {
  id: string;
  name: string;
  price: number;
  volume: number | null;
  packSize: number | null;
  packType: string | null;
  category: { name: string; icon: string; color: string };
}

interface WheelOption {
  id: string;
  label: string;
  emoji: string;
  color: string;
  weight: number;
  product: WheelProduct | null;
}

interface SnusSlumpProps {
  onClose: () => void;
  onBuy: (product: WheelProduct | null, optionId: string) => void;
}

const CX = 150, CY = 150, R = 132;

function polar(angleDeg: number, r = R) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function slice(start: number, end: number) {
  const s = polar(start);
  const e = polar(end);
  const large = end - start > 180 ? 1 : 0;
  return `M${CX},${CY} L${s.x.toFixed(3)},${s.y.toFixed(3)} A${R},${R} 0 ${large} 1 ${e.x.toFixed(3)},${e.y.toFixed(3)}Z`;
}

function pickWinner(options: WheelOption[]) {
  const total = options.reduce((s, o) => s + o.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    r -= options[i].weight;
    if (r <= 0) return i;
  }
  return options.length - 1;
}

function lighten(hex: string, amount = 0.25) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  return `rgb(${r},${g},${b})`;
}

// mini animated wheel for the FAB
export function MiniWheel({ size = 32 }: { size?: number }) {
  const colors = ["#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444"];
  const n = colors.length;
  const cx = size / 2, cy = size / 2, r = size / 2 - 1;

  function miniPolar(angleDeg: number) {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  function miniSlice(start: number, end: number) {
    const s = miniPolar(start);
    const e = miniPolar(end);
    const large = end - start > 180 ? 1 : 0;
    return `M${cx},${cy} L${s.x},${s.y} A${r},${r} 0 ${large} 1 ${e.x},${e.y}Z`;
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {colors.map((color, i) => {
        const seg = 360 / n;
        return (
          <path key={i} d={miniSlice(i * seg, (i + 1) * seg)} fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
        );
      })}
      <circle cx={cx} cy={cy} r={size * 0.18} fill="#0f172a" />
      <circle cx={cx} cy={cy} r={size * 0.09} fill="rgba(255,255,255,0.25)" />
    </svg>
  );
}

export function SnusSlump({ onClose, onBuy }: SnusSlumpProps) {
  const [options, setOptions] = useState<WheelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [spinDuration, setSpinDuration] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "spinning" | "result">("idle");

  useEffect(() => {
    fetch("/api/wheel")
      .then((r) => r.json())
      .then((data) => { setOptions(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  function spin() {
    if (isSpinning || options.length === 0) return;
    const winnerIdx = pickWinner(options);
    const segAngle = 360 / options.length;
    const winnerCenter = (winnerIdx + 0.5) * segAngle;
    const alignTo = (360 - winnerCenter % 360 + 360) % 360;
    const currentMod = rotation % 360;
    let delta = alignTo - currentMod;
    if (delta <= 0) delta += 360;
    const newRotation = rotation + 8 * 360 + delta;

    setSpinDuration(5000);
    setIsSpinning(true);
    setWinner(null);
    setPhase("spinning");
    setRotation(newRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setWinner(winnerIdx);
      setPhase("result");
    }, 5100);
  }

  const won = winner !== null ? options[winner] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(145deg, #0f172a, #1a1f35)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-purple-400/80">SnusSlump</p>
            <h2 className="font-bold text-xl tracking-tight">Slupa din snus type shi</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center px-5 pb-6 gap-5">
          {loading ? (
            <div className="w-[300px] h-[300px] rounded-full bg-white/5 animate-pulse" />
          ) : options.length === 0 ? (
            <div className="w-[300px] h-[300px] rounded-full bg-white/5 flex flex-col items-center justify-center gap-3">
              <p className="text-muted-foreground text-sm text-center px-10">Lägg till alternativ i adminpanelen</p>
            </div>
          ) : (
            <div className="relative select-none">
              {/* Outer glow ring when spinning */}
              <AnimatePresence>
                {isSpinning && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-[-8px] rounded-full pointer-events-none"
                    style={{ boxShadow: "0 0 40px rgba(139,92,246,0.35), 0 0 80px rgba(139,92,246,0.15)" }}
                  />
                )}
              </AnimatePresence>

              {/* Result glow */}
              <AnimatePresence>
                {phase === "result" && won && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-[-8px] rounded-full pointer-events-none"
                    style={{ boxShadow: `0 0 50px ${won.color}50, 0 0 100px ${won.color}20` }}
                  />
                )}
              </AnimatePresence>

              {/* Pointer */}
              <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
                <div style={{
                  width: 0, height: 0,
                  borderLeft: "9px solid transparent",
                  borderRight: "9px solid transparent",
                  borderTop: "24px solid white",
                  filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
                }} />
              </div>

              {/* The wheel */}
              <div
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinDuration > 0 ? `transform ${spinDuration}ms cubic-bezier(0.15, 0.85, 0.25, 1)` : "none",
                  willChange: "transform",
                  borderRadius: "50%",
                  overflow: "hidden",
                  boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.4)",
                }}
              >
                <svg width="300" height="300" viewBox="0 0 300 300">
                  {options.map((opt, i) => {
                    const segAngle = 360 / options.length;
                    const start = i * segAngle;
                    const end = (i + 1) * segAngle;
                    const mid = (start + end) / 2;
                    const isWinner = phase === "result" && winner === i;
                    const isDimmed = phase === "result" && winner !== null && winner !== i;

                    return (
                      <g key={opt.id} style={{ transition: "opacity 0.5s" }} opacity={isDimmed ? 0.35 : 1}>
                        {/* Segment fill */}
                        <path d={slice(start, end)} fill={opt.color} />
                        {/* Subtle lighter edge for depth */}
                        <path d={slice(start, end)} fill="none" stroke={lighten(opt.color, 0.2)} strokeWidth="1" />

                        {/* Text rotated to center of segment */}
                        <g transform={`rotate(${mid} ${CX} ${CY})`}>
                          {/* Label */}
                          <text
                            x={CX}
                            y={CY - 88}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={options.length > 7 ? "8" : options.length > 5 ? "9" : "11"}
                            fontWeight="700"
                            fill="white"
                            letterSpacing="0.5"
                            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}
                          >
                            {opt.label.length > 11 ? opt.label.slice(0, 10) + "…" : opt.label}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* Divider lines */}
                  {options.map((_, i) => {
                    const angle = (i * 360 / options.length) - 90;
                    const rad = angle * Math.PI / 180;
                    return (
                      <line
                        key={i}
                        x1={CX} y1={CY}
                        x2={CX + R * Math.cos(rad)}
                        y2={CY + R * Math.sin(rad)}
                        stroke="rgba(0,0,0,0.3)"
                        strokeWidth="1.5"
                      />
                    );
                  })}

                  {/* Center hub */}
                  <circle cx={CX} cy={CY} r="22" fill="#0f172a" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
                  <circle cx={CX} cy={CY} r="10" fill="rgba(255,255,255,0.08)" />
                  <circle cx={CX} cy={CY} r="4" fill="rgba(255,255,255,0.2)" />
                </svg>
              </div>
            </div>
          )}

          {/* Result card */}
          <AnimatePresence>
            {phase === "result" && won && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 22, stiffness: 300, delay: 0.1 }}
                className="w-full rounded-xl p-4 text-center"
                style={{
                  background: `linear-gradient(135deg, ${won.color}20, ${won.color}08)`,
                  border: `1px solid ${won.color}35`,
                }}
              >
                <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: `${won.color}cc` }}>
                  Du fick
                </p>
                <p className="font-bold text-xl">{won.label}</p>
                {won.product && (
                  <p className="text-sm text-white/50 mt-0.5">
                    {won.product.category.icon} {won.product.name} · {formatCurrency(won.product.price)}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          {phase === "result" && won ? (
            <div className="flex gap-2 w-full">
              <button
                onClick={() => { setPhase("idle"); setWinner(null); setSpinDuration(0); spin(); }}
                className="w-10 h-10 rounded-xl bg-white/8 hover:bg-white/12 flex-shrink-0 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => { onBuy(won.product, won.id); onClose(); }}
                className="flex-1 h-10 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${won.color}, ${won.color}bb)` }}
              >
                <ShoppingCart className="w-4 h-4" />
                Köp
              </button>
            </div>
          ) : (
            <button
              onClick={spin}
              disabled={isSpinning || options.length === 0}
              className="w-full h-12 rounded-xl font-bold tracking-wide text-white text-base disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #7c3aed, #db2777)" }}
            >
              {isSpinning ? "Snurrar..." : "Snurra hjulet"}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
