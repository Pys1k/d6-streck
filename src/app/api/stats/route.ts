import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

let statsCache: { data: unknown; ts: number } | null = null;
const STATS_TTL = 4000;

export async function GET(req: NextRequest) {
  const fresh = req.nextUrl.searchParams.get("fresh") === "1";
  if (!fresh && statsCache && Date.now() - statsCache.ts < STATS_TTL) {
    return NextResponse.json(statsCache.data);
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [recent, personAgg, catAgg, dailyRaw] = await Promise.all([
      prisma.purchase.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          personName: true,
          quantity: true,
          note: true,
          createdAt: true,
          product: {
            select: {
              name: true,
              price: true,
              category: { select: { name: true, icon: true, color: true } },
            },
          },
        },
      }),

      // Use product.price * qty so D6 discounts are invisible publicly
      prisma.$queryRaw<{ personName: string; spent: number; purchases: bigint }[]>`
        SELECT p."personName",
          CAST(SUM(pr.price * p.quantity) AS FLOAT) AS spent,
          COUNT(*) AS purchases
        FROM "Purchase" p
        JOIN "Product" pr ON p."productId" = pr.id
        GROUP BY p."personName"
        ORDER BY spent DESC
      `,

      prisma.$queryRaw<{ name: string; icon: string; color: string; total: number; count: bigint }[]>`
        SELECT c.name, c.icon, c.color,
          CAST(SUM(pr.price * p.quantity) AS FLOAT) AS total,
          SUM(p.quantity) AS count
        FROM "Purchase" p
        JOIN "Product" pr ON p."productId" = pr.id
        JOIN "Category" c ON pr."categoryId" = c.id
        GROUP BY c.name, c.icon, c.color
        ORDER BY total DESC
      `,

      prisma.purchase.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, quantity: true, product: { select: { price: true } } },
      }),
    ]);

    const personStats = personAgg.map((g) => ({
      name: g.personName,
      spent: g.spent,
      purchases: Number(g.purchases),
    }));

    const categoryBreakdown = catAgg.map((r) => ({
      name: r.name,
      icon: r.icon,
      color: r.color,
      total: r.total,
      count: Number(r.count),
    }));

    const dailySpending: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dailySpending[d.toISOString().slice(0, 10)] = 0;
    }
    for (const p of dailyRaw) {
      const day = new Date(p.createdAt).toISOString().slice(0, 10);
      if (day in dailySpending) dailySpending[day] += p.product.price * p.quantity;
    }
    const dailyData = Object.entries(dailySpending).map(([date, amount]) => ({
      date,
      amount: Math.round(amount * 100) / 100,
    }));

    // Derive totals from personAgg (saves one DB round-trip)
    const totalSpent = personStats.reduce((s, p) => s + p.spent, 0);
    const totalPurchases = personStats.reduce((s, p) => s + p.purchases, 0);

    const topSpender = personStats[0] ? { name: personStats[0].name, spent: personStats[0].spent } : null;
    const mostPurchases = personStats.length ? personStats.reduce((max, p) => p.purchases > max.purchases ? p : max) : null;
    const topCategory = categoryBreakdown[0] || null;
    // Derive lastBuyer from most recent purchase (saves one DB round-trip)
    const lastBuyer = recent[0] ? { name: recent[0].personName, product: recent[0].product.name } : null;

    const data = {
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalPurchases,
      personStats,
      categoryBreakdown,
      dailyData,
      leaderboard: { topSpender, mostPurchases, topCategory, lastBuyer },
      // full price here, D6 discounts stay invisible publicly
      recentPurchases: recent.map((p) => ({
        ...p,
        totalCost: Math.round(p.product.price * p.quantity * 100) / 100,
      })),
    };

    statsCache = { data, ts: Date.now() };
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
