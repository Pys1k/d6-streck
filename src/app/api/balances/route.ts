import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const purchases = await prisma.purchase.findMany({
      select: {
        id: true,
        personName: true,
        quantity: true,
        totalCost: true,
        note: true,
        createdAt: true,
        product: {
          select: {
            name: true,
            price: true,
            category: { select: { icon: true, color: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(purchases);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
