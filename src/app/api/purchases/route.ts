import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// admin only, response includes d6Price
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const where = search
      ? { personName: { contains: search, mode: "insensitive" as const } }
      : {};

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: { product: { include: { category: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.purchase.count({ where }),
    ]);

    return NextResponse.json({ purchases, total, page, limit });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { personName, productId, quantity, note, wheelOptionId } = body;

    const parsedQty = Math.floor(Number(quantity));
    if (!personName?.trim() || !productId || !parsedQty || parsedQty < 1) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (personName.trim().length > 50) {
      return NextResponse.json({ error: "Name too long" }, { status: 400 });
    }

    const [product, person] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      prisma.person.findUnique({ where: { name: personName.trim() } }),
    ]);
    if (!product || !product.isActive) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const clampedQty = Math.min(parsedQty, 100);
    const unitPrice = (person?.isD6 && product.d6Price != null) ? product.d6Price : product.price;
    const totalCost = Math.round(unitPrice * clampedQty * 100) / 100;
    const purchase = await prisma.purchase.create({
      data: {
        personName: personName.trim(),
        productId,
        quantity: clampedQty,
        totalCost,
        note: note?.trim()?.slice(0, 200) || null,
      },
      select: { id: true, totalCost: true },
    });

    // wheel wins consume the option once the buy goes through
    if (typeof wheelOptionId === "string" && wheelOptionId) {
      await prisma.wheelOption.deleteMany({ where: { id: wheelOptionId } });
    }

    return NextResponse.json(purchase, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 });
  }
}
