import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// recalculates D6 persons' purchase totals to current d6Price
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const staffPersons = await prisma.person.findMany({
      where: { isD6: true },
      select: { name: true },
    });
    if (staffPersons.length === 0) {
      return NextResponse.json({ checked: 0, updated: 0, diff: 0 });
    }

    const purchases = await prisma.purchase.findMany({
      where: {
        personName: { in: staffPersons.map((p) => p.name) },
        product: { d6Price: { not: null } },
      },
      select: {
        id: true,
        quantity: true,
        totalCost: true,
        product: { select: { d6Price: true } },
      },
    });

    const updates = purchases
      .map((p) => ({
        id: p.id,
        oldTotal: p.totalCost,
        newTotal: Math.round(p.product.d6Price! * p.quantity * 100) / 100,
      }))
      .filter((u) => Math.abs(u.newTotal - u.oldTotal) >= 0.005);

    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map((u) =>
          prisma.purchase.update({
            where: { id: u.id },
            data: { totalCost: u.newTotal },
          })
        )
      );
    }

    const diff = updates.reduce((s, u) => s + (u.oldTotal - u.newTotal), 0);
    return NextResponse.json({
      checked: purchases.length,
      updated: updates.length,
      diff: Math.round(diff * 100) / 100,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
