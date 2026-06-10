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
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name?.trim()?.slice(0, 100),
        price: body.price !== undefined ? Math.max(0.01, parseFloat(body.price) || 0.01) : undefined,
        d6Price: body.d6Price !== undefined ? (body.d6Price === "" || body.d6Price === null ? null : Math.max(0.01, parseFloat(body.d6Price) || 0.01)) : undefined,
        volume: body.volume !== undefined ? (parseFloat(body.volume) || null) : undefined,
        packSize: body.packSize !== undefined ? (parseInt(body.packSize) || null) : undefined,
        packType: body.packType?.trim() || undefined,
        categoryId: body.categoryId,
        isActive: body.isActive,
        showInMenu: body.showInMenu,
      },
      include: { category: true },
    });

    // resync D6 totals for this product when d6Price changes
    if (body.d6Price !== undefined) {
      const staff = await prisma.person.findMany({
        where: { isD6: true },
        select: { name: true },
      });
      if (staff.length > 0) {
        const unit = product.d6Price ?? product.price;
        const purchases = await prisma.purchase.findMany({
          where: { productId: id, personName: { in: staff.map((s) => s.name) } },
          select: { id: true, quantity: true, totalCost: true },
        });
        const updates = purchases
          .map((p) => ({ id: p.id, newTotal: Math.round(unit * p.quantity * 100) / 100, oldTotal: p.totalCost }))
          .filter((u) => Math.abs(u.newTotal - u.oldTotal) >= 0.005);
        if (updates.length > 0) {
          await prisma.$transaction(
            updates.map((u) =>
              prisma.purchase.update({ where: { id: u.id }, data: { totalCost: u.newTotal } })
            )
          );
        }
      }
    }

    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
