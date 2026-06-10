"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, RefreshCw } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PersonAvatar } from "./PersonAvatar";

interface Purchase {
  id: string;
  personName: string;
  quantity: number;
  totalCost: number;
  note: string | null;
  createdAt: string;
  product: {
    name: string;
    price: number;
    category: { name: string; icon: string; color: string };
  };
}

interface Person {
  id: string;
  name: string;
  color: string;
  imageData?: string | null;
}

interface RecentActivityProps {
  purchases: Purchase[];
  loading: boolean;
  onRefresh: () => void;
  persons?: Person[];
}

export function RecentActivity({ purchases, loading, onRefresh, persons = [] }: RecentActivityProps) {
  const personMap = useMemo(
    () => Object.fromEntries(persons.map((p) => [p.name, p])),
    [persons]
  );

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          Senaste aktivitet
        </h3>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
              <div className="h-5 bg-white/10 rounded w-16" />
            </div>
          ))}
        </div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <span className="text-4xl">🍺</span>
          <p className="mt-2">Inga köp än. Tryck + för att lägga till!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {purchases.map((p, i) => {
            const personData = personMap[p.personName];
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: `${p.product.category.color}20` }}
                >
                  {p.product.category.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PersonAvatar
                      name={p.personName}
                      color={personData?.color}
                      imageData={personData?.imageData}
                      size="xs"
                    />
                    <span className="font-medium text-sm">{p.personName}</span>
                    <span className="text-muted-foreground text-xs">köpte</span>
                    <span className="text-sm truncate">
                      {p.quantity > 1 ? `${p.quantity}x ` : ""}{p.product.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</span>
                    {p.note && (
                      <span className="text-xs text-muted-foreground truncate">· {p.note}</span>
                    )}
                  </div>
                </div>
                <div className="text-sm font-semibold text-purple-400 flex-shrink-0">
                  {formatCurrency(p.totalCost)}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
