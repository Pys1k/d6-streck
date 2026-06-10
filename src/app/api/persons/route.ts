import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const persons = await prisma.person.findMany({ orderBy: { name: "asc" } });
    if (!session) {
      return NextResponse.json(persons.map(({ isD6: _, ...p }) => p));
    }
    return NextResponse.json(persons);
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

function randomColor(): string {
  const h = Math.floor(Math.random() * 360);
  const s = 65, l = 55;
  const sl = s / 100, ll = l / 100;
  const a = sl * Math.min(ll, 1 - ll);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
