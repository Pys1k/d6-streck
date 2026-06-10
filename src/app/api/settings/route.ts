import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

let settingsCache: { data: { sk_name: string; sk_swish: string }; ts: number } | null = null;
const SETTINGS_TTL = 5 * 60_000;

export async function GET() {
  if (settingsCache && Date.now() - settingsCache.ts < SETTINGS_TTL) {
    return NextResponse.json(settingsCache.data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }
  try {
    const settings = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    const data = { sk_name: map.sk_name ?? "", sk_swish: map.sk_swish ?? "" };
    settingsCache = { data, ts: Date.now() };
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ sk_name: "", sk_swish: "" });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const updates: Promise<unknown>[] = [];

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

    await Promise.all(updates);
    settingsCache = null;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
