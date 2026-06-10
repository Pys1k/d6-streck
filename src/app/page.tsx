"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, ShoppingCart, Trophy, Activity } from "lucide-react";
import { AddPurchaseModal } from "@/components/AddPurchaseModal";
import { SnusSlump, MiniWheel } from "@/components/SnusSlump";
import { StatsCards } from "@/components/StatsCards";
import { Leaderboard } from "@/components/Leaderboard";
import { RecentActivity } from "@/components/RecentActivity";
import { SpendingChart } from "@/components/SpendingChart";
import { BalanceTable } from "@/components/BalanceTable";
import { Navbar } from "@/components/Navbar";
import { SystembolagetHours } from "@/components/SystembolagetHours";
import { formatCurrency } from "@/lib/utils";


export interface StatsData {
  totalSpent: number;
  totalPurchases: number;
  personStats: {
    name: string;
    spent: number;
    purchases: number;
  }[];
  categoryBreakdown: {
    name: string;
    icon: string;
    color: string;
    total: number;
    count: number;
  }[];
  dailyData: { date: string; amount: number }[];
  leaderboard: {
    topSpender: { name: string; spent: number } | null;
    mostPurchases: { name: string; purchases: number } | null;
    topCategory: { name: string; icon: string; total: number } | null;
    lastBuyer: { name: string; product: string } | null;
  };
  recentPurchases: {
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
  }[];
}

export interface BalancePurchase {
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

export default function Home() {
  const [showModal, setShowModal] = useState(false);
  const [showWheel, setShowWheel] = useState(false);
  const [wheelCart, setWheelCart] = useState<{ product: { id: string; name: string; price: number; volume: number | null; packSize: number | null; packType: string | null; category: { name: string; icon: string; color: string } }; quantity: number }[]>([]);
  const [winningWheelOptionId, setWinningWheelOptionId] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<BalancePurchase[] | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [persons, setPersons] = useState<{ id: string; name: string; color: string; imageData?: string | null }[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "balances" | "leaderboard">(
    "dashboard"
  );

  const fetchStats = useCallback(async (fresh = false) => {
    try {
      const url = fresh ? "/api/stats?fresh=1" : "/api/stats";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        try { localStorage.setItem("d6_stats", JSON.stringify(data)); } catch {}
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBalances = useCallback(async () => {
    setBalancesLoading(true);
    try {
      const res = await fetch("/api/balances");
      if (res.ok) setBalances(await res.json());
    } catch {
      // silently fail
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("d6_stats");
      if (cached) { setStats(JSON.parse(cached)); setLoading(false); }
    } catch {}

    // Always fetch fresh on mount (navigation back, refresh, etc.)
    fetchStats();
    const interval = setInterval(() => fetchStats(true), 5000);

    // Also refresh when tab becomes visible again
    const onVisible = () => { if (document.visibilityState === "visible") fetchStats(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === "balances" && !balances) fetchBalances();
    if (activeTab === "leaderboard") fetchStats(true);
  }, [activeTab, balances, fetchBalances, fetchStats]);

  useEffect(() => {
    fetch("/api/persons").then(r => r.json()).then(data => setPersons(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "balances", label: "Skulder", icon: Users },
    { id: "leaderboard", label: "Topplista", icon: Trophy },
  ] as const;

  return (
    <div className="min-h-screen pb-32">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 pt-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.img
            src="/logo.svg"
            alt="D6"
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-full mx-auto mb-3"
            animate={{ boxShadow: ["0 0 20px rgba(249,115,22,0.3)", "0 0 45px rgba(249,115,22,0.65)", "0 0 20px rgba(249,115,22,0.3)"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-2">D6 streck</h1>
          <p className="text-muted-foreground text-lg">Håll koll på vem som köpt vad på D6 rummet 🍺</p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 flex justify-center"
          >
            <SystembolagetHours />
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 glass rounded-xl p-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                activeTab === tab.id ? "text-white" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-purple-600 rounded-lg shadow-lg"
                  transition={{ type: "spring", damping: 30, stiffness: 400 }}
                />
              )}
              <tab.icon className="w-4 h-4 relative z-10" />
              <span className="hidden sm:block relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <StatsCards stats={stats} loading={loading} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <SpendingChart data={stats?.dailyData || []} />
                </div>
                <div>
                  <CategoryBreakdown categories={stats?.categoryBreakdown || []} />
                </div>
              </div>
              <RecentActivity purchases={stats?.recentPurchases || []} loading={loading} onRefresh={fetchStats} persons={persons} />
            </motion.div>
          )}

          {activeTab === "balances" && (
            <motion.div
              key="balances"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <BalanceTable purchases={balances || []} loading={balancesLoading} persons={persons} />
            </motion.div>
          )}

          {activeTab === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Leaderboard stats={stats} loading={loading} persons={persons} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center mt-8 mb-4">{/* ignorera :p */}
          <a
            href="/trycrackme.exe"
            download
            className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/20 transition-colors text-sm font-bold select-none"
            title="?"
          >
            ?
          </a>
        </div>
      </main>

      {/*add purchase */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-2xl glow z-50"
      >
        <Plus className="w-8 h-8 text-white" />
      </motion.button>

      {/*SnusSlump */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowWheel(true)}
        className="fixed bottom-6 left-6 w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-2xl z-50"
        style={{ boxShadow: "0 0 20px rgba(139,92,246,0.45)" }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <MiniWheel size={36} />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {showWheel && (
          <SnusSlump
            onClose={() => setShowWheel(false)}
            onBuy={(product, optionId) => {
              if (product) setWheelCart([{ product, quantity: 1 }]);
              setWinningWheelOptionId(optionId);
              setShowWheel(false);
              setShowModal(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <AddPurchaseModal
            onClose={() => { setShowModal(false); setWheelCart([]); setWinningWheelOptionId(null); }}
            onSuccess={() => {
              setShowModal(false);
              setWheelCart([]);
              setWinningWheelOptionId(null);
              fetchStats(true);
              setBalances(null);
            }}
            initialCart={wheelCart}
            wheelOptionId={winningWheelOptionId ?? undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryBreakdown({
  categories,
}: {
  categories: { name: string; icon: string; color: string; total: number; count: number }[];
}) {
  const max = Math.max(...categories.map((c) => c.total), 1);
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <ShoppingCart className="w-4 h-4 text-purple-400" />
        Kategorier
      </h3>
      {categories.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">Inga köp än</p>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.name}>
              <div className="flex justify-between text-sm mb-1">
                <span>
                  {cat.icon} {cat.name}
                </span>
                <span className="text-muted-foreground">{formatCurrency(cat.total)}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(cat.total / max) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
