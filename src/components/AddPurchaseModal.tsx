"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, MessageSquare, Loader2, Check, Plus, UserPlus, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  volume: number | null;
  packSize: number | null;
  packType: string | null;
  category: { name: string; icon: string; color: string };
}

interface Person {
  id: string;
  name: string;
  color: string;
  imageData?: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface AddPurchaseModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialCart?: { product: Product; quantity: number }[];
  wheelOptionId?: string;
}

function Avatar({ person, size = "sm" }: { person: Person; size?: "sm" | "md" }) {
  const sz = size === "md" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";
  if (person.imageData) {
    return (
      <img
        src={person.imageData}
        alt={person.name}
        className={`${sz} rounded-full object-cover flex-shrink-0`}
        style={{ border: `2px solid ${person.color}60` }}
      />
    );
  }
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ backgroundColor: `${person.color}30`, border: `2px solid ${person.color}60`, color: person.color }}
    >
      {person.name[0]?.toUpperCase()}
    </div>
  );
}

export function AddPurchaseModal({ onClose, onSuccess, initialCart, wheelOptionId }: AddPurchaseModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>(initialCart ?? []);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"product" | "details">(initialCart?.length ? "details" : "product");
  const [stepDir, setStepDir] = useState(initialCart?.length ? 1 : 1);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [addPersonLoading, setAddPersonLoading] = useState(false);
  const [addPersonError, setAddPersonError] = useState("");

  function goStep(s: "product" | "details") {
    setStepDir(s === "details" ? 1 : -1);
    setStep(s);
  }

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => { setProducts(Array.isArray(data) ? data : []); setProductsLoading(false); })
      .catch(() => setProductsLoading(false));
    fetch("/api/persons")
      .then((r) => r.json())
      .then((data) => setPersons(Array.isArray(data) ? data : []));
  }, []);

  function getQty(productId: string) {
    return cart.find((c) => c.product.id === productId)?.quantity ?? 0;
  }

  function setQty(product: Product, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.product.id !== product.id));
    } else {
      setCart((prev) => {
        const existing = prev.find((c) => c.product.id === product.id);
        if (existing) return prev.map((c) => c.product.id === product.id ? { ...c, quantity: qty } : c);
        return [...prev, { product, quantity: qty }];
      });
    }
  }

  const totalCost = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  async function handleAddPerson() {
    const name = newPersonName.trim();
    if (!name) return;
    setAddPersonLoading(true);
    setAddPersonError("");
    try {
      const res = await fetch("/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fel");
      setPersons((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedPerson(data);
      setNewPersonName("");
      setAddingPerson(false);
    } catch (err: unknown) {
      setAddPersonError(err instanceof Error ? err.message : "Fel");
    } finally {
      setAddPersonLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPerson || cart.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const results = await Promise.all(
        cart.map((item, i) =>
          fetch("/api/purchases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              personName: selectedPerson.name,
              productId: item.product.id,
              quantity: item.quantity,
              note: note.trim() || undefined,
              // first item also consumes the wheel option
              wheelOptionId: i === 0 ? wheelOptionId : undefined,
            }),
          })
        )
      );
      if (results.some((r) => !r.ok)) throw new Error("Något gick fel");
      setSuccess(true);
      setTimeout(onSuccess, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90dvh]"
      >
        {success ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative flex flex-col items-center justify-center py-12 gap-3 overflow-hidden"
          >
            <Confetti />
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center relative z-10">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <p className="font-semibold text-green-400 relative z-10">Köpet sparades!</p>
            <p className="text-muted-foreground text-sm relative z-10">{formatCurrency(totalCost)} · {selectedPerson?.name}</p>
          </motion.div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-purple-400" />
                <h2 className="font-bold text-lg">Lägg till köp</h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step tabs */}
            <div className="flex border-b border-white/10">
              {(["product", "details"] as const).map((s, i) => (
                <button
                  key={s}
                  onClick={() => step === "details" && s === "product" && goStep("product")}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    step === s ? "text-purple-400 border-b-2 border-purple-400" : "text-muted-foreground"
                  } ${step === "product" && s === "details" ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {i + 1}. {s === "product" ? "Välj produkter" : "Detaljer"}
                </button>
              ))}
            </div>

            <div className="flex flex-col flex-1 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {step === "product" ? (
                  <motion.div
                    key="product"
                    initial={{ opacity: 0, x: stepDir * -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: stepDir * 30 }}
                    transition={{ duration: 0.18, ease: "easeInOut" }}
                    className="flex flex-col flex-1 overflow-hidden"
                  >
                    {/* Product list */}
                    <div className="p-4 overflow-y-auto flex-1 scrollbar-none space-y-1.5">
                      {productsLoading ? (
                        [...Array(5)].map((_, i) => (
                          <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
                        ))
                      ) : products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                          <span className="text-4xl">🛒</span>
                          <p className="font-medium text-muted-foreground">Inga produkter finns ännu</p>
                          <a href="/admin" className="text-sm text-purple-400 hover:text-purple-300 underline underline-offset-2">
                            Gå till adminpanelen →
                          </a>
                        </div>
                      ) : products.map((p) => {
                        const qty = getQty(p.id);
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 ${
                              qty > 0
                                ? "border-purple-500/60 bg-purple-500/8"
                                : "border-white/8 bg-white/3"
                            }`}
                          >
                            <span
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                              style={{ backgroundColor: `${p.category.color}20` }}
                            >
                              {p.category.icon}
                            </span>
                            <span
                              className="flex-1 font-medium text-sm"
                              style={{ color: qty > 0 ? p.category.color : undefined }}
                            >
                              {p.name}
                            </span>
                            <span className="text-sm text-purple-300/70 mr-1">{formatCurrency(p.price)}</span>

                            {/* Quantity control */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setQty(p, qty - 1)}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                  qty > 0
                                    ? "bg-purple-500/20 hover:bg-purple-500/30 text-purple-300"
                                    : "bg-white/5 text-white/20 cursor-not-allowed"
                                }`}
                                disabled={qty === 0}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className={`w-5 text-center text-sm font-bold tabular-nums ${qty > 0 ? "text-white" : "text-white/20"}`}>
                                {qty > 0 ? qty : ""}
                              </span>
                              <button
                                type="button"
                                onClick={() => setQty(p, qty + 1)}
                                className="w-7 h-7 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 flex items-center justify-center transition-all"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Cart summary bar */}
                    <div className="p-4 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => goStep("details")}
                        disabled={cart.length === 0}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between px-5 transition-opacity"
                      >
                        <span className="text-sm">
                          {cart.length === 0 ? "Välj produkter" : `${totalItems} st valt`}
                        </span>
                        <span>{cart.length > 0 ? `${formatCurrency(totalCost)} →` : ""}</span>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: stepDir * 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: stepDir * -30 }}
                    transition={{ duration: 0.18, ease: "easeInOut" }}
                    className="overflow-y-auto flex-1"
                  >
                    <form onSubmit={handleSubmit} className="p-5 space-y-5">
                      {/* Cart summary */}
                      <div
                        className="p-3 rounded-xl border border-white/10 bg-white/5 cursor-pointer space-y-1.5"
                        onClick={() => goStep("product")}
                      >
                        {cart.map((item) => (
                          <div key={item.product.id} className="flex items-center gap-2 text-sm">
                            <span>{item.product.category.icon}</span>
                            <span className="flex-1 text-white/80">{item.quantity}× {item.product.name}</span>
                            <span className="text-purple-400 font-medium">{formatCurrency(item.product.price * item.quantity)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-1 border-t border-white/10 text-xs text-muted-foreground">
                          <span>ändra</span>
                          <span className="font-semibold text-white">{formatCurrency(totalCost)}</span>
                        </div>
                      </div>

                      {/* Person picker */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium text-muted-foreground">Vem köper? *</label>
                          {!addingPerson && (
                            <button
                              type="button"
                              onClick={() => setAddingPerson(true)}
                              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Lägg till person
                            </button>
                          )}
                        </div>

                        {addingPerson && (
                          <div className="flex gap-2 mb-3">
                            <input
                              autoFocus
                              value={newPersonName}
                              onChange={(e) => setNewPersonName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddPerson(); } }}
                              placeholder="Namn..."
                              maxLength={50}
                              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={handleAddPerson}
                              disabled={addPersonLoading || !newPersonName.trim()}
                              className="px-3 py-2 rounded-xl bg-purple-600 text-white text-sm disabled:opacity-50 flex items-center"
                            >
                              {addPersonLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAddingPerson(false); setNewPersonName(""); setAddPersonError(""); }}
                              className="px-3 py-2 rounded-xl bg-white/5 text-muted-foreground"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {addPersonError && <p className="text-red-400 text-xs mb-2">{addPersonError}</p>}

                        {persons.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">Inga personer ännu, lägg till en!</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {persons.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setSelectedPerson(selectedPerson?.id === p.id ? null : p)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-150 ${
                                  selectedPerson?.id === p.id
                                    ? "border-purple-500 bg-purple-500/10"
                                    : "border-white/10 bg-white/5 hover:border-white/20"
                                }`}
                              >
                                <Avatar person={p} size="sm" />
                                <span className="text-sm font-medium">{p.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Note */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-muted-foreground">Kommentar (valfritt)</label>
                        <div className="relative">
                          <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Fredagsmys, förfest..."
                            maxLength={200}
                            rows={2}
                            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500 resize-none transition-colors"
                          />
                        </div>
                      </div>

                      {error && <p className="text-destructive text-sm text-center">{error}</p>}

                      <button
                        type="submit"
                        disabled={loading || !selectedPerson}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity"
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <ShoppingCart className="w-5 h-5" />
                            {selectedPerson ? `Köp för ${selectedPerson.name}` : "Välj person"}
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function Confetti() {
  const pieces = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => {
      const colors = ["#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#f97316","#06b6d4"];
      return {
        id: i,
        color: colors[i % colors.length],
        x: Math.sin(i * 2.4) * 130,
        y: -(Math.abs(Math.cos(i * 1.7)) * 150 + 40),
        rotate: (i * 137) % 360,
        w: ((i * 7) % 10) + 5,
        h: ((i * 11) % 8) + 4,
        delay: (i % 5) * 0.04,
      };
    }), []);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{ width: p.w, height: p.h, backgroundColor: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate }}
          transition={{ duration: 0.85, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
