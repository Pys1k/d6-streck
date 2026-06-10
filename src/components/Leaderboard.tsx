"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, ShoppingBag, Star, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { StatsData } from "@/app/page";
import { PersonAvatar } from "./PersonAvatar";

interface Person {
  id: string;
  name: string;
  color: string;
  imageData?: string | null;
}

interface LeaderboardProps {
  stats: StatsData | null;
  loading: boolean;
  persons?: Person[];
}

export function Leaderboard({ stats, loading, persons = [] }: LeaderboardProps) {
  const personMap = useMemo(
    () => Object.fromEntries(persons.map((p) => [p.name, p])),
    [persons]
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-2xl p-5 animate-pulse">
            <div className="h-5 bg-white/10 rounded w-1/2 mb-4" />
            <div className="h-10 bg-white/10 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const lb = stats?.leaderboard;
  if (!lb) return null;

  const cards = [
    {
      title: "Störst spenderare",
      icon: Crown,
      color: "from-amber-600 to-yellow-500",
      bg: "from-amber-500/10 to-yellow-500/10",
      border: "border-amber-500/20",
      name: lb.topSpender?.name,
      value: lb.topSpender ? formatCurrency(lb.topSpender.spent) : null,
      sub: "totalt spenderat",
    },
    {
      title: "Flest köp",
      icon: ShoppingBag,
      color: "from-blue-600 to-cyan-500",
      bg: "from-blue-500/10 to-cyan-500/10",
      border: "border-blue-500/20",
      name: lb.mostPurchases?.name,
      value: lb.mostPurchases ? `${lb.mostPurchases.purchases} köp` : null,
      sub: "antal köp totalt",
    },
    {
      title: "Senaste köpet",
      icon: Clock,
      color: "from-violet-600 to-purple-500",
      bg: "from-violet-500/10 to-purple-500/10",
      border: "border-violet-500/20",
      name: lb.lastBuyer?.name,
      value: lb.lastBuyer?.product ?? null,
      sub: "senast köpt produkt",
    },
    {
      title: "Populäraste kategorin",
      icon: Star,
      color: "from-purple-600 to-pink-500",
      bg: "from-purple-500/10 to-pink-500/10",
      border: "border-purple-500/20",
      name: lb.topCategory ? `${lb.topCategory.icon} ${lb.topCategory.name}` : null,
      value: lb.topCategory ? formatCurrency(lb.topCategory.total) : null,
      sub: "totalt spenderat",
    },
  ];

  const sortedPersons = stats ? [...stats.personStats].sort((a, b) => b.spent - a.spent) : [];
  const maxSpent = sortedPersons[0]?.spent || 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card, i) => {
          const personData = card.name ? personMap[card.name] : null;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-2xl p-5 border bg-gradient-to-br ${card.bg} ${card.border}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <card.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{card.title}</span>
              </div>
              {card.name ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    {personData && (
                      <PersonAvatar
                        name={card.name}
                        color={personData.color}
                        imageData={personData.imageData}
                        size="sm"
                      />
                    )}
                    <div className="text-xl font-bold truncate">{card.name}</div>
                  </div>
                  <div className="text-purple-400 font-semibold">{card.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{card.sub}</div>
                </>
              ) : (
                <div className="text-muted-foreground text-sm py-2">Inga data än</div>
              )}
            </motion.div>
          );
        })}
      </div>

      {stats && sortedPersons.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Fullständig ranking
          </h3>
          <div className="space-y-3">
            {sortedPersons.map((person, i) => {
              const personData = personMap[person.name];
              const barColor = personData?.color || "#8b5cf6";
              return (
                <motion.div
                  key={person.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      i === 0 ? "bg-amber-500 text-black" :
                      i === 1 ? "bg-slate-400 text-black" :
                      i === 2 ? "bg-amber-700 text-white" :
                      "bg-white/10 text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <PersonAvatar
                    name={person.name}
                    color={personData?.color}
                    imageData={personData?.imageData}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-sm truncate">{person.name}</span>
                      <span className="font-bold text-purple-400 text-sm ml-2 flex-shrink-0">
                        {formatCurrency(person.spent)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: barColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(person.spent / maxSpent) * 100}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 w-12 text-right">
                    {person.purchases} köp
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
