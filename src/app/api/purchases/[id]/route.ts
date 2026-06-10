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
    const { personName, quantity, note } = body;

    const existing = await prisma.purchase.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const newPersonName = personName?.trim() || existing.personName;
    const newQuantity = Math.min(100, Math.max(1, Math.floor(Number(quantity)) || existing.quantity));

    const person = await prisma.person.findUnique({ where: { name: newPersonName } });
    const unitPrice =
      person?.isD6 && existing.product.d6Price != null
        ? existing.product.d6Price
        : existing.product.price;
    const newTotalCost = Math.round(unitPrice * newQuantity * 100) / 100;

    const updated = await prisma.purchase.update({
      where: { id },
      data: {
        personName: newPersonName,
        quantity: newQuantity,
        totalCost: newTotalCost,
        note: note !== undefined ? note?.trim()?.slice(0, 200) || null : existing.note,
      },
      include: { product: { include: { category: true } } },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await prisma.purchase.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
