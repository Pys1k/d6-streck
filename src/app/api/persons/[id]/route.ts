import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// data-URL string length cap (~3 MB of image after base64 decoding)
const MAX_IMAGE_CHARS = 4_000_000;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const data: { name?: string; imageData?: string | null; isD6?: boolean } = {};

    if (body.name !== undefined) {
      const name = body.name?.trim()?.slice(0, 50);
      if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
      data.name = name;
    }

    if (body.imageData !== undefined) {
      if (body.imageData !== null) {
        const img = String(body.imageData);
        if (!img.startsWith("data:image/")) {
          return NextResponse.json({ error: "Invalid image" }, { status: 400 });
        }
        if (img.length > MAX_IMAGE_CHARS) {
          return NextResponse.json({ error: "Bilden är för stor (max ~3 MB)" }, { status: 400 });
        }
      }
      data.imageData = body.imageData;
    }

    if (body.isD6 !== undefined) {
      data.isD6 = Boolean(body.isD6);
    }

    const existing = await prisma.person.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const person = await prisma.person.update({ where: { id }, data });

    // purchases store the name, move them along on rename
    if (data.name && data.name !== existing.name) {
      await prisma.purchase.updateMany({
        where: { personName: existing.name },
        data: { personName: person.name },
      });
    }

    // resync stored totals when D6 status changes
    if (data.isD6 !== undefined && data.isD6 !== existing.isD6) {
      const purchases = await prisma.purchase.findMany({
        where: { personName: person.name, product: { d6Price: { not: null } } },
        select: {
          id: true,
          quantity: true,
          totalCost: true,
          product: { select: { price: true, d6Price: true } },
        },
      });
      const updates = purchases
        .map((p) => {
          const unit = person.isD6 ? p.product.d6Price! : p.product.price;
          return { id: p.id, newTotal: Math.round(unit * p.quantity * 100) / 100, oldTotal: p.totalCost };
        })
        .filter((u) => Math.abs(u.newTotal - u.oldTotal) >= 0.005);
      if (updates.length > 0) {
        await prisma.$transaction(
          updates.map((u) =>
            prisma.purchase.update({ where: { id: u.id }, data: { totalCost: u.newTotal } })
          )
        );
      }
    }

    return NextResponse.json(person);
  } catch (e: unknown) {
    const msg = e instanceof Error && e.message.includes("Unique") ? "Namnet finns redan" : "Failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const person = await prisma.person.findUnique({ where: { id } });
    if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // purchases reference the name, not an FK — remove them along with the person
    await prisma.$transaction([
      prisma.purchase.deleteMany({ where: { personName: person.name } }),
      prisma.person.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
