"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import {
  LogOut, Package, ShoppingCart, BarChart2, Plus, Trash2,
  X, Check, Loader2, AlertTriangle, Settings2, Pencil, Users, Eye, EyeOff
} from "lucide-react";
import { formatCurrency, formatDate, randomColor } from "@/lib/utils";

function WheelIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="2.5" />
      <line x1="12" y1="9.5" x2="12" y2="2" />
      <line x1="14.2" y1="10.8" x2="20.7" y2="7" />
      <line x1="14.2" y1="13.2" x2="20.7" y2="17" />
      <line x1="12" y1="14.5" x2="12" y2="22" />
      <line x1="9.8" y1="13.2" x2="3.3" y2="17" />
      <line x1="9.8" y1="10.8" x2="3.3" y2="7" />
    </svg>
  );
}

interface Product {
  id: string;
  name: string;
  price: number;
  d6Price: number | null;
  volume: number | null;
  packSize: number | null;
  packType: string | null;
  isActive: boolean;
  showInMenu: boolean;
  category: { id: string; name: string; icon: string; color: string };
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  _count: { products: number };
}

interface Purchase {
  id: string;
  personName: string;
  quantity: number;
  totalCost: number;
  note: string | null;
  createdAt: string;
  product: { name: string; price: number; category: { icon: string } };
}

interface Person {
  id: string;
  name: string;
  color: string;
  imageData?: string | null;
  isD6: boolean;
  purchaseCount: number;
}

type AdminTab = "products" | "purchases" | "categories" | "persons" | "wheel" | "settings";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [clearDebtConfirm, setClearDebtConfirm] = useState<string | null>(null);
  const [purchasesTotal, setPurchasesTotal] = useState(0);
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [purchasesLoadingMore, setPurchasesLoadingMore] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, pur, per] = await Promise.all([
        fetch("/api/products?all=1").then((r) => r.json()),
        fetch("/api/categories").then((r) => r.json()),
        fetch("/api/purchases?limit=50&page=1").then((r) => r.json()),
        fetch("/api/persons").then((r) => r.json()),
      ]);
      setProducts(Array.isArray(p) ? p : []);
      setCategories(Array.isArray(c) ? c : []);
      setPurchases(pur.purchases || []);
      setPurchasesTotal(pur.total ?? 0);
      setPurchasesPage(1);
      setPersons(Array.isArray(per) ? per : []);
    } catch {}
    setLoading(false);
  }, []);

  const loadMorePurchases = useCallback(async () => {
    setPurchasesLoadingMore(true);
    try {
      const nextPage = purchasesPage + 1;
      const data = await fetch(`/api/purchases?limit=50&page=${nextPage}`).then((r) => r.json());
      setPurchases((prev) => [...prev, ...(data.purchases || [])]);
      setPurchasesPage(nextPage);
    } catch {}
    setPurchasesLoadingMore(false);
  }, [purchasesPage]);

  useEffect(() => {
    if (session) fetchAll();
  }, [session, fetchAll]);

  async function deletePurchase(id: string) {
    const res = await fetch(`/api/purchases/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      setPurchasesTotal((t) => Math.max(0, t - 1));
      fetch("/api/stats?fresh=1").catch(() => {});
    }
    setDeleteConfirm(null);
  }

  async function deleteProduct(id: string) {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) setProducts((prev) => prev.filter((p) => p.id !== id));
    setDeleteConfirm(null);
  }

  function toggleProductVisibility(id: string, showInMenu: boolean) {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, showInMenu } : p));
    fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showInMenu }),
    }).then((res) => {
      if (!res.ok) setProducts((prev) => prev.map((p) => p.id === id ? { ...p, showInMenu: !showInMenu } : p));
    });
  }

  async function deleteCategory(id: string) {
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) setCategories((prev) => prev.filter((c) => c.id !== id));
    setDeleteConfirm(null);
  }

  async function deletePerson(id: string) {
    const res = await fetch(`/api/persons/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPersons((prev) => prev.filter((p) => p.id !== id));
      fetch("/api/stats?fresh=1").catch(() => {});
    }
    setDeleteConfirm(null);
  }

  async function clearPersonDebt(id: string) {
    const res = await fetch(`/api/persons/${id}/reset-debts`, { method: "POST" });
    if (res.ok) {
      await fetchAll();
      fetch("/api/stats?fresh=1").catch(() => {});
    }
    setClearDebtConfirm(null);
  }

  function toggleD6(id: string, isD6: boolean) {
    setPersons((prev) => prev.map((p) => p.id === id ? { ...p, isD6 } : p));
    fetch(`/api/persons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isD6 }),
    }).then((res) => {
      if (!res.ok) setPersons((prev) => prev.map((p) => p.id === id ? { ...p, isD6: !isD6 } : p));
    });
  }

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: React.ElementType; count: number | null }[] = [
    { id: "products", label: "Produkter", icon: Package, count: products.length },
    { id: "purchases", label: "Köp", icon: ShoppingCart, count: purchasesTotal },
    { id: "categories", label: "Kategorier", icon: BarChart2, count: categories.length },
    { id: "persons", label: "Personer", icon: Users, count: persons.length },
    { id: "wheel", label: "SnusSlump", icon: WheelIcon, count: null },
    { id: "settings", label: "Övrigt", icon: Settings2, count: null },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="glass border-b border-white/5 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Inloggad som {session.user?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="px-3 py-1.5 rounded-lg glass text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Startsida
            </a>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logga ut
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="flex gap-1 glass rounded-xl p-1 mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? "bg-purple-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <t.icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:block">{t.label}</span>
              {t.count !== null && (
                <span className={`hidden sm:block text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-white/20" : "bg-white/10"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Products */}
        {tab === "products" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Produkter</h2>
              <button
                onClick={() => { setShowProductForm(true); setEditingProduct(null); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Ny produkt
              </button>
            </div>

            {(showProductForm || editingProduct) && (
              <ProductForm
                categories={categories}
                product={editingProduct ?? undefined}
                onClose={() => { setShowProductForm(false); setEditingProduct(null); }}
                onSuccess={() => { setShowProductForm(false); setEditingProduct(null); fetchAll(); }}
              />
            )}

            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 glass rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((p) => (
                  <div key={p.id} className="glass rounded-xl p-4 flex items-center gap-4">
                    <span className="text-2xl">{p.category.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.category.name} · {formatCurrency(p.price)}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleProductVisibility(p.id, !p.showInMenu)}
                      title={p.showInMenu ? "Dölj från köpmenyn" : "Visa i köpmenyn"}
                      className={`p-2 rounded-lg transition-colors ${p.showInMenu ? "text-green-400 hover:bg-green-500/10" : "text-muted-foreground hover:bg-white/10 hover:text-white"}`}
                    >
                      {p.showInMenu ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { setEditingProduct(p); setShowProductForm(false); setDeleteConfirm(null); }}
                      className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {deleteConfirm === p.id ? (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Ta bort?
                        <button onClick={() => deleteProduct(p.id)} className="ml-1 font-bold">Ja</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-muted-foreground">Nej</button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(p.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Purchases */}
        {tab === "purchases" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Alla köp</h2>
            {loading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-16 glass rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {purchases.map((p) => (
                  <div key={p.id}>
                    {editingPurchase?.id === p.id ? (
                      <PurchaseEditForm
                        purchase={p}
                        onClose={() => setEditingPurchase(null)}
                        onSuccess={() => { setEditingPurchase(null); fetchAll(); }}
                      />
                    ) : (
                      <div className="glass rounded-xl p-4 flex items-center gap-4">
                        <span className="text-xl">{p.product.category.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            {p.personName} · {p.quantity}x {p.product.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(p.createdAt)}{p.note ? ` · ${p.note}` : ""}
                          </div>
                        </div>
                        <div className="text-purple-400 font-semibold">{formatCurrency(p.totalCost)}</div>
                        <button
                          onClick={() => { setEditingPurchase(p); setDeleteConfirm(null); }}
                          className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {deleteConfirm === p.id ? (
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Ta bort?
                            <button onClick={() => deletePurchase(p.id)} className="ml-1 font-bold">Ja</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-muted-foreground">Nej</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(p.id)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {purchases.length < purchasesTotal && (
                  <button
                    onClick={loadMorePurchases}
                    disabled={purchasesLoadingMore}
                    className="w-full py-3 rounded-xl glass text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {purchasesLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : `Ladda fler (${purchases.length} av ${purchasesTotal})`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Categories */}
        {tab === "categories" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Kategorier</h2>
              <button
                onClick={() => { setShowCategoryForm(true); setEditingCategory(null); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Ny kategori
              </button>
            </div>

            {(showCategoryForm || editingCategory) && (
              <CategoryForm
                category={editingCategory ?? undefined}
                onClose={() => { setShowCategoryForm(false); setEditingCategory(null); }}
                onSuccess={() => { setShowCategoryForm(false); setEditingCategory(null); fetchAll(); }}
              />
            )}

            <div className="space-y-2">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="glass rounded-xl p-4 flex items-center gap-3"
                  style={{ borderColor: `${c.color}30` }}
                >
                  <span className="text-2xl">{c.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c._count.products} produkter</div>
                  </div>
                  <button
                    onClick={() => { setEditingCategory(c); setShowCategoryForm(false); setDeleteConfirm(null); }}
                    className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {c._count.products > 0 ? (
                    <button
                      disabled
                      title="Kategorin har produkter – flytta eller ta bort dem först"
                      className="p-2 rounded-lg text-muted-foreground/30 cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : deleteConfirm === c.id ? (
                    <span className="text-xs text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Ta bort?
                      <button onClick={() => deleteCategory(c.id)} className="ml-1 font-bold">Ja</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-muted-foreground">Nej</button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(c.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Persons */}
        {tab === "persons" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Personer</h2>
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-16 glass rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {persons.map((p) => (
                  <div key={p.id}>
                    {editingPerson?.id === p.id ? (
                      <PersonEditForm
                        person={p}
                        onClose={() => setEditingPerson(null)}
                        onSuccess={() => { setEditingPerson(null); fetchAll(); }}
                      />
                    ) : (
                      <div className="glass rounded-xl p-4 flex items-center gap-3">
                        {p.imageData ? (
                          <img src={p.imageData} alt={p.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" style={{ border: `2px solid ${p.color}60` }} />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                            style={{ backgroundColor: `${p.color}30`, border: `2px solid ${p.color}60`, color: p.color }}
                          >
                            {p.name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 font-medium">{p.name}</div>
                        <button
                          onClick={() => toggleD6(p.id, !p.isD6)}
                          title={p.isD6 ? "D6-person, klicka för att ta bort" : "Gör till D6-person"}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                            p.isD6 ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-white/5 text-white/20 hover:bg-white/10 hover:text-white/60"
                          }`}
                        >
                          D6
                        </button>
                        <button
                          onClick={() => { setEditingPerson(p); setDeleteConfirm(null); setClearDebtConfirm(null); }}
                          className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {clearDebtConfirm === p.id ? (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {p.purchaseCount > 0 ? `Nollställ ${p.purchaseCount} köp?` : "Nollställ?"}
                            <button onClick={() => clearPersonDebt(p.id)} className="ml-1 font-bold">Ja</button>
                            <button onClick={() => setClearDebtConfirm(null)} className="text-muted-foreground">Nej</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => { setClearDebtConfirm(p.id); setDeleteConfirm(null); }}
                            disabled={p.purchaseCount === 0}
                            title={p.purchaseCount > 0 ? "Rensa alla skulder för denna person" : "Ingen skuld att rensa"}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                              p.purchaseCount > 0
                                ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
                                : "bg-white/5 text-white/20 cursor-not-allowed"
                            }`}
                          >
                            Rensa skulder
                          </button>
                        )}
                        {deleteConfirm === p.id ? (
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {p.purchaseCount > 0 ? `Ta bort + ${p.purchaseCount} köp?` : "Ta bort?"}
                            <button onClick={() => deletePerson(p.id)} className="ml-1 font-bold">Ja</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-muted-foreground">Nej</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => { setDeleteConfirm(p.id); setClearDebtConfirm(null); }}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {persons.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-8">Inga personer ännu</p>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "wheel" && <WheelAdmin />}

        {tab === "settings" && <SKSettings />}
      </div>
    </div>
  );
}

function SKSettings() {
  const [name, setName] = useState("");
  const [swish, setSwish] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [recalcLoading, setRecalcLoading] = useState(false);
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null);

  async function runRecalc() {
    setRecalcLoading(true);
    setRecalcMsg(null);
    try {
      const res = await fetch("/api/admin/recalc", { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setRecalcMsg(d.updated > 0 ? `${d.updated} köp omräknade` : "Allt stämmer redan, inga köp behövde ändras");
        fetch("/api/stats?fresh=1").catch(() => {});
      } else {
        setRecalcMsg("Något gick fel");
      }
    } catch {
      setRecalcMsg("Något gick fel");
    }
    setRecalcLoading(false);
  }

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { setName(d.sk_name ?? ""); setSwish(d.sk_swish ?? ""); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sk_name: name, sk_swish: swish }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwSaving(true);
    setPwMsg(null);
    const res = await fetch("/api/admin/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
    });
    const data = await res.json();
    setPwSaving(false);
    if (res.ok) {
      setPwMsg({ ok: true, text: "Lösenord uppdaterat!" });
      setCurPw(""); setNewPw("");
    } else {
      setPwMsg({ ok: false, text: data.error || "Misslyckades" });
    }
    setTimeout(() => setPwMsg(null), 3000);
  }

  if (loading) return <div className="h-40 glass rounded-2xl animate-pulse" />;

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">SK-inställningar</h2>
        <form onSubmit={handleSave} className="glass rounded-2xl p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            SK visas i navbaren och kan swishas direkt via knappen.
          </p>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Namn</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Viken"
              maxLength={50}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Swishnummer</label>
            <input
              value={swish}
              onChange={(e) => setSwish(e.target.value)}
              placeholder="070 123 45 67"
              maxLength={20}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500 transition-colors font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><Check className="w-4 h-4" /> Sparat!</> : "Spara"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Byt lösenord</h2>
        <form onSubmit={handlePasswordChange} className="glass rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Nuvarande lösenord</label>
            <input
              type="password"
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Nytt lösenord</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              minLength={6}
              placeholder="Minst 6 tecken"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          {pwMsg && (
            <p className={`text-sm text-center py-1.5 rounded-lg ${pwMsg.ok ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"}`}>
              {pwMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={pwSaving}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Byt lösenord"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Underhåll</h2>
        <div className="glass rounded-2xl p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Räknar om alla köp av D6-personer till nuvarande D6-priser så att Skulder stämmer.
            Behövs normalt inte, D6-ändringar synkas automatiskt.
          </p>
          <button
            onClick={runRecalc}
            disabled={recalcLoading}
            className="w-full py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {recalcLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Räkna om D6-köp"}
          </button>
          {recalcMsg && (
            <p className="text-sm text-center py-1.5 rounded-lg text-green-400 bg-green-500/10">{recalcMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductForm({
  categories,
  product,
  onClose,
  onSuccess,
}: {
  categories: Category[];
  product?: Product;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    price: product?.price?.toString() ?? "",
    d6Price: product?.d6Price?.toString() ?? "",
    categoryId: product?.category.id ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = product ? `/api/products/${product.id}` : "/api/products";
      const method = product ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-5 space-y-3 border border-purple-500/20">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold">{product ? "Redigera produkt" : "Ny produkt"}</h3>
        <button type="button" onClick={onClose}><X className="w-4 h-4" /></button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Namn *</label>
          <input className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Falcon Export 5,2%" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Pris (kr) *</label>
          <input className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
            type="number" step="0.1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required placeholder="17.90" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">D6-pris (kr) <span className="text-white/30">valfritt</span></label>
          <input className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-amber-500"
            type="number" step="0.1" value={form.d6Price} onChange={(e) => setForm({ ...form, d6Price: e.target.value })} placeholder="12.00" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Kategori *</label>
          <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
            value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
            <option value="">Välj kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Avbryt
        </button>
        <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Spara</>}
        </button>
      </div>
    </form>
  );
}

function PurchaseEditForm({
  purchase,
  onClose,
  onSuccess,
}: {
  purchase: Purchase;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [personName, setPersonName] = useState(purchase.personName);
  const [quantity, setQuantity] = useState(purchase.quantity);
  const [note, setNote] = useState(purchase.note ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/purchases/${purchase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personName, quantity, note }),
    });
    setLoading(false);
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-xl p-4 space-y-3 border border-purple-500/20">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{purchase.product.name}</span>
        <button type="button" onClick={onClose}><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Namn</label>
          <input className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
            value={personName} onChange={(e) => setPersonName(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Antal</label>
          <input className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
            type="number" min={1} max={100} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} required />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Kommentar</label>
        <input className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          value={note} onChange={(e) => setNote(e.target.value)} placeholder="Valfritt" maxLength={200} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-muted-foreground">Avbryt</button>
        <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Spara</>}
        </button>
      </div>
    </form>
  );
}

function CategoryForm({
  category,
  onClose,
  onSuccess,
}: {
  category?: Category;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: category?.name ?? "",
    icon: category?.icon ?? "🍺",
    color: category?.color ?? randomColor(),
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = category ? `/api/categories/${category.id}` : "/api/categories";
      const method = category ? "PATCH" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  const commonIcons = ["🍺", "🍷", "🥃", "🍸", "🍹", "🥂", "🍾", "🫗", "🍏", "🍋"]; //Emojis snyggt eller nått

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-5 space-y-3 border border-purple-500/20">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold">{category ? "Redigera kategori" : "Ny kategori"}</h3>
        <button type="button" onClick={onClose}><X className="w-4 h-4" /></button>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Namn *</label>
        <input className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Öl, Vin..." />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-2 block">Ikon</label>
        <div className="flex flex-wrap gap-2">
          {commonIcons.map((icon) => (
            <button key={icon} type="button" onClick={() => setForm({ ...form, icon })}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${form.icon === icon ? "bg-purple-500/30 border border-purple-500" : "bg-white/5 border border-white/10 hover:bg-white/10"}`}>
              {icon}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-muted-foreground">Avbryt</button>
        <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Spara"}
        </button>
      </div>
    </form>
  );
}

function PersonEditForm({ person, onClose, onSuccess }: { person: Person; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(person.name);
  const [imageData, setImageData] = useState<string | null>(person.imageData ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 200;
      const scale = Math.min(max / img.width, max / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      setImageData(canvas.toDataURL("image/jpeg", 0.85));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/persons/${person.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), imageData }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fel");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-5 space-y-4 border border-purple-500/20">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Redigera person</h3>
        <button type="button" onClick={onClose}><X className="w-4 h-4" /></button>
      </div>

      <div className="flex items-center gap-4">
        {imageData ? (
          <img src={imageData} alt="avatar" className="w-16 h-16 rounded-full object-cover flex-shrink-0" style={{ border: `2px solid ${person.color}60` }} />
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0"
            style={{ backgroundColor: `${person.color}30`, border: `2px solid ${person.color}60`, color: person.color }}>
            {name[0]?.toUpperCase() || "?"}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm cursor-pointer transition-colors text-center">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            Välj bild
          </label>
          {imageData && (
            <button type="button" onClick={() => setImageData(null)}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-colors">
              Ta bort bild
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Namn</label>
        <input
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          value={name} onChange={(e) => setName(e.target.value)} required maxLength={50}
        />
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-muted-foreground">Avbryt</button>
        <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Spara</>}
        </button>
      </div>
    </form>
  );
}

const WHEEL_COLORS = ["#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6","#f97316","#a855f7","#06b6d4"];
const WHEEL_EMOJIS = ["🎯","🍺","🍷","🥃","🍸","🎰","🤌","💀","🔥","⚡","🌊","🎲"];

interface WheelOption {
  id: string;
  label: string;
  emoji: string;
  color: string;
  weight: number;
  product: { id: string; name: string } | null;
}

function WheelAdmin() {
  const [options, setOptions] = useState<WheelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState<WheelOption | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    const data = await fetch("/api/wheel").then((r) => r.json());
    setOptions(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOptions(); }, [fetchOptions]);

  async function deleteOption(id: string) {
    const res = await fetch(`/api/wheel/${id}`, { method: "DELETE" });
    if (res.ok) setOptions((prev) => prev.filter((o) => o.id !== id));
    setDeleteConfirm(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">SnusSlump</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Alternativen som visas på hjulet</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingOption(null); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nytt alternativ
        </button>
      </div>

      {(showForm || editingOption) && (
        <WheelOptionForm
          option={editingOption ?? undefined}
          onClose={() => { setShowForm(false); setEditingOption(null); }}
          onSuccess={() => { setShowForm(false); setEditingOption(null); fetchOptions(); }}
        />
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 glass rounded-xl animate-pulse" />)}</div>
      ) : options.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">Inga alternativ ännu</p>
      ) : (
        <div className="space-y-2">
          {options.map((o) => (
            <div key={o.id} className="glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: `${o.color}30`, border: `2px solid ${o.color}50` }}>
                {o.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{o.label}</div>
                <div className="text-xs text-muted-foreground">Vikt: {o.weight}</div>
              </div>
              <button onClick={() => { setEditingOption(o); setShowForm(false); setDeleteConfirm(null); }} className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              {deleteConfirm === o.id ? (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Ta bort?
                  <button onClick={() => deleteOption(o.id)} className="ml-1 font-bold">Ja</button>
                  <button onClick={() => setDeleteConfirm(null)} className="text-muted-foreground">Nej</button>
                </span>
              ) : (
                <button onClick={() => setDeleteConfirm(o.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WheelOptionForm({ option, onClose, onSuccess }: { option?: WheelOption; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    label: option?.label ?? "",
    emoji: option?.emoji ?? "🎯",
    color: option?.color ?? WHEEL_COLORS[Math.floor(Math.random() * WHEEL_COLORS.length)],
    weight: option?.weight?.toString() ?? "1",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = option ? `/api/wheel/${option.id}` : "/api/wheel";
      const method = option ? "PATCH" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-5 space-y-3 border border-purple-500/20">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{option ? "Redigera alternativ" : "Nytt alternativ"}</h3>
        <button type="button" onClick={onClose}><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Etikett *</label>
          <input className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
            value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required placeholder="General Snus" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Vikt (sannolikhet)</label>
          <input className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
            type="number" min="1" max="10" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Ikon</label>
        <div className="flex flex-wrap gap-1.5">
          {WHEEL_EMOJIS.map((em) => (
            <button key={em} type="button" onClick={() => setForm({ ...form, emoji: em })}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${form.emoji === em ? "bg-purple-500/30 border border-purple-500" : "bg-white/5 border border-white/10 hover:bg-white/10"}`}>
              {em}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Färg</label>
        <div className="flex flex-wrap gap-1.5">
          {WHEEL_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
              className={`w-7 h-7 rounded-full transition-all ${form.color === c ? "ring-2 ring-white ring-offset-1 ring-offset-slate-900 scale-110" : "opacity-70 hover:opacity-100"}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-muted-foreground">Avbryt</button>
        <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Spara</>}
        </button>
      </div>
    </form>
  );
}
