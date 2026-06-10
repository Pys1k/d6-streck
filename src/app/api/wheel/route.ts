import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const options = await prisma.wheelOption.findMany({
      include: {
        // don't leak d6Price in the public payload
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            volume: true,
            packSize: true,
            packType: true,
            category: true,
          },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(options);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.label?.trim()) return NextResponse.json({ error: "Label required" }, { status: 400 });
    const option = await prisma.wheelOption.create({
      data: {
        label: body.label.trim().slice(0, 30),
        emoji: body.emoji || "🎯",
        color: body.color || "#8b5cf6",
        productId: body.productId || null,
        weight: Math.max(1, parseInt(body.weight) || 1),
        order: parseInt(body.order) || 0,
      },
      include: { product: { include: { category: true } } },
    });
    return NextResponse.json(option, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
