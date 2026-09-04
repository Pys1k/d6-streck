import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    const data = { sk_name: map.sk_name ?? "", sk_swish: map.sk_swish ?? "" };
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const updates: Prisma.PrismaPromise<unknown>[] = [];

    if (typeof body.sk_name === "string") {
      updates.push(
        prisma.setting.upsert({
          where: { key: "sk_name" },
          update: { value: body.sk_name.trim() },
          create: { key: "sk_name", value: body.sk_name.trim() },
        })
      );
    }
    if (typeof body.sk_swish === "string") {
      updates.push(
        prisma.setting.upsert({
          where: { key: "sk_swish" },
          update: { value: body.sk_swish.trim() },
          create: { key: "sk_swish", value: body.sk_swish.trim() },
        })
      );
    }
    await prisma.$transaction(updates);
    await prisma.$transaction(updates);
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["sk_name", "sk_swish"] } },
    });
    const map: Record<string, string> = {};
    for (const setting of settings) map[setting.key] = setting.value;
    return NextResponse.json({
      success: true,
      sk_name: map.sk_name ?? "",
      sk_swish: map.sk_swish ?? "",
    });
  } catch {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
