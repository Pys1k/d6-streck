import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const [persons, counts] = await Promise.all([
      prisma.person.findMany({ orderBy: { name: "asc" } }),
      prisma.purchase.groupBy({ by: ["personName"], _count: { _all: true } }),
    ]);
    const countMap = new Map(counts.map((c) => [c.personName, c._count._all]));
    const withCounts = persons.map((p) => ({ ...p, purchaseCount: countMap.get(p.name) ?? 0 }));
    if (!session) {
      return NextResponse.json(withCounts.map(({ isD6: _, ...p }) => p));
    }
    return NextResponse.json(withCounts);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = body.name?.trim()?.slice(0, 50);
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const person = await prisma.person.create({
      data: { name, color: body.color || randomColor() },
    });
    return NextResponse.json(person, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error && e.message.includes("Unique") ? "Namnet finns redan" : "Failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
