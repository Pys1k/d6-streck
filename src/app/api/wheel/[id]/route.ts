import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const option = await prisma.wheelOption.update({
      where: { id },
      data: {
        ...(body.label && { label: body.label.trim().slice(0, 30) }),
        ...(body.emoji !== undefined && { emoji: body.emoji }),
        ...(body.color && { color: body.color }),
        ...(body.productId !== undefined && { productId: body.productId || null }),
        ...(body.weight !== undefined && { weight: Math.max(1, parseInt(body.weight) || 1) }),
        ...(body.order !== undefined && { order: parseInt(body.order) || 0 }),
      },
      include: { product: { include: { category: true } } },
    });
    return NextResponse.json(option);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await prisma.wheelOption.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
