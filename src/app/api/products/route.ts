import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "1";

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(all ? {} : { showInMenu: true }),
      },
      include: { category: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    });

    if (!session) {
      return NextResponse.json(products.map(({ d6Price: _, ...p }) => p));
    }
    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, price, d6Price, volume, packSize, packType, categoryId } = body;

    const parsedPrice = parseFloat(price);
    if (!name?.trim() || !price || isNaN(parsedPrice) || parsedPrice <= 0 || !categoryId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const parsedD6Price = d6Price ? parseFloat(d6Price) : null;

    const product = await prisma.product.create({
      data: {
        name: name.trim().slice(0, 100),
        price: parsedPrice,
        d6Price: parsedD6Price && parsedD6Price > 0 ? parsedD6Price : null,
        volume: volume ? parseFloat(volume) : null,
        packSize: packSize ? parseInt(packSize) : null,
        packType: packType?.trim() || null,
        categoryId,
      },
      include: { category: true },
    });

    await prisma.wheelOption.create({
      data: {
        label: product.name.slice(0, 30),
        color: product.category.color,
        productId: product.id,
        weight: 1,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
