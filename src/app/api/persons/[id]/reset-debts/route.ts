import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const person = await prisma.person.findUnique({ where: { id } });
    if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const result = await prisma.purchase.deleteMany({ where: { personName: person.name } });
    return NextResponse.json({ success: true, removedCount: result.count });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
