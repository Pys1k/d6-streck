"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
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
    category: { icon: string; color: string };
  };
}

interface Person {
  id: string;
  name: string;
  color: string;
  imageData?: string | null;
}

interface PersonDebt {
  name: string;
  total: number;
  purchases: Purchase[];
}

export function BalanceTable({
  purchases,
  loading,
  persons = [],
}: {
  purchases: Purchase[];
  loading: boolean;
  persons?: Person[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const personMap = useMemo(
    () => Object.fromEntries(persons.map((p) => [p.name, p])),
    [persons]
  );

  const debtors = useMemo(() => {
    const byPerson: Record<string, PersonDebt> = {};
    for (const p of purchases) {
      if (!byPerson[p.personName]) byPerson[p.personName] = { name: p.personName, total: 0, purchases: [] };
      byPerson[p.personName].total += p.totalCost;
      byPerson[p.personName].purchases.push(p);
    }
    return Object.values(byPerson).sort((a, b) => b.total - a.total);
  }, [purchases]);

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg px-1">Vem är skyldig vad?</h3>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 glass rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : debtors.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <span className="text-4xl">🎉</span>
          <p className="mt-3 font-medium">Inga köp ännu</p>
          <p className="text-sm text-muted-foreground mt-1">Tryck + för att lägga till ett köp</p>
        </div>
      ) : (
        debtors.map((person, i) => {
          const isOpen = expanded === person.name;
          const personData = personMap[person.name];
          const accentColor = personData?.color || "#ef4444";

          return (
            <motion.div
              key={person.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl overflow-hidden"
              style={{ border: `1px solid ${accentColor}25` }}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : person.name)}
                className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
              >
                <PersonAvatar
                  name={person.name}
                  color={accentColor}
                  imageData={personData?.imageData}
                  size="md"
                />

                <div className="flex-1 min-w-0 text-left">
                  <div className="font-semibold">{person.name}</div>
                </div>

                <div className="text-right flex-shrink-0 mr-2">
                  <div className="text-lg font-bold" style={{ color: accentColor }}>
                    {formatCurrency(person.total)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {person.purchases.length} köp
                  </div>
                </div>

                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t overflow-hidden"
                    style={{ borderColor: `${accentColor}15` }}
                  >
                    <div className="px-4 py-3 space-y-2">
                      {person.purchases
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((p) => (
                          <div key={p.id} className="flex items-center gap-3 py-1.5">
                            <span
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                              style={{ backgroundColor: `${p.product.category.color}20` }}
                            >
                              {p.product.category.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm">
                                {p.quantity > 1 && (
                                  <span className="text-muted-foreground mr-1">{p.quantity}×</span>
                                )}
                                {p.product.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {formatDate(p.createdAt)}
                              </div>
                              {p.note && (
                                <div className="text-xs text-muted-foreground truncate">{p.note}</div>
                              )}
                            </div>
                            <div className="text-sm font-medium text-purple-400 flex-shrink-0">
                              {formatCurrency(p.totalCost)}
                            </div>
                          </div>
                        ))}

                      <div className="flex justify-between pt-2 border-t border-white/10 mt-1">
                        <span className="text-sm font-semibold">Totalt</span>
                        <span className="text-sm font-bold" style={{ color: accentColor }}>
                          {formatCurrency(person.total)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
