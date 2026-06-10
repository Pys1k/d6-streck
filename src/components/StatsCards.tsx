"use client";

import { motion } from "framer-motion";
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { StatsData } from "@/app/page";

interface StatsCardsProps {
  stats: StatsData | null;
  loading: boolean;
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  const cards = [
    {
      label: "Totalt spenderat",
      value: stats ? formatCurrency(stats.totalSpent) : null,
      icon: DollarSign,
      color: "from-purple-600 to-pink-600",
      glow: "rgba(168,85,247,0.2)",
    },
    {
      label: "Antal köp",
      value: stats?.totalPurchases ?? null,
      icon: ShoppingCart,
      color: "from-blue-600 to-cyan-600",
      glow: "rgba(59,130,246,0.2)",
    },
    {
      label: "Antal personer",
      value: stats?.personStats.length ?? null,
      icon: Users,
      color: "from-emerald-600 to-teal-600",
      glow: "rgba(16,185,129,0.2)",
    },
    {
      label: "Snitt per person",
      value: stats && stats.personStats.length > 0
        ? formatCurrency(stats.totalSpent / stats.personStats.length)
        : null,
      icon: TrendingUp,
      color: "from-amber-600 to-orange-600",
      glow: "rgba(245,158,11,0.2)",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white/5 border border-white/10 rounded-2xl p-4"
          style={{ boxShadow: `0 4px 24px ${card.glow}` }}
        >
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
            <card.icon className="w-4 h-4 text-white" />
          </div>
          {loading ? (
            <>
              <div className="h-8 w-20 bg-white/10 rounded-lg animate-pulse mb-2" />
              <div className="h-3 w-28 bg-white/5 rounded animate-pulse" />
            </>
          ) : (
            <>
              <motion.div
                key={String(card.value)}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="text-2xl font-bold tabular-nums"
              >
                {card.value ?? "—"}
              </motion.div>
              <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
