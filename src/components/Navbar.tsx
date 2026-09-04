"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Shield, Settings } from "lucide-react";
import { useEffect, useState } from "react";

interface SKInfo {
  sk_name: string;
  sk_swish: string;
}

function swishUrl(swish: string): string | undefined {
  const digits = swish.replace(/\D/g, "");
  if (!digits) return undefined;
  const intl = digits.startsWith("0") ? `46${digits.slice(1)}` : digits;
  return `https://app.swish.nu/1/p/sw/?sw=${intl}`;
}

export function Navbar() {
  const { data: session } = useSession();
  const [sk, setSk] = useState<SKInfo | null>(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("d6_sk");
      if (cached) setSk(JSON.parse(cached));
    } catch {}
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const next = {
          sk_name: typeof data?.sk_name === "string" ? data.sk_name : "",
          sk_swish: typeof data?.sk_swish === "string" ? data.sk_swish : "",
        };
        setSk(next);
        try { localStorage.setItem("d6_sk", JSON.stringify(next)); } catch {}
      })
      .catch(() => {});
  }, []);

  const swishHref = sk ? swishUrl(sk.sk_swish) : undefined;

  return (
    <nav className="sticky top-0 z-40 glass border-b border-white/5 px-4 py-3">
      <div className="max-w-6xl mx-auto relative flex items-center justify-between">
        {/* logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <img src="/logo.svg" alt="D6" className="h-9 w-9 rounded-full" />
          <span className="font-bold text-lg hidden sm:block">D6 streck</span>
        </div>

        {}
        {sk && (sk.sk_name || sk.sk_swish) && (
          swishHref ? (
            <a
              href={swishHref}
              title="Swisha SK"
              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl bg-green-500/10 border border-green-500/25 hover:bg-green-500/20 hover:border-green-500/40 transition-all duration-200"
              style={{ boxShadow: "0 0 12px rgba(34,197,94,0.15)" }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-500/70">Swisha SK</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-green-300 leading-none">{sk.sk_name || "—"}</span>
                {sk.sk_swish && (
                  <span className="hidden sm:block text-xs font-mono text-green-400/80 leading-none">{sk.sk_swish}</span>
                )}
              </div>
            </a>
          ) : (
            <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl bg-green-500/10 border border-green-500/25 opacity-80">
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-500/70">Swisha SK</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-green-300 leading-none">{sk.sk_name || "—"}</span>
              </div>
            </div>
          )
        )}

        {/* admin */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {session ? (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm font-medium transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:block">Admin</span>
            </Link>
          ) : (
            <Link
              href="/admin/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass glass-hover text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:block">Admin</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
