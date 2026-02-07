import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const day = searchParams.get("day");

    const bands = await prisma.band.findMany({
      where: day ? { day: parseInt(day) } : undefined,
      orderBy: {
        startTime: "asc",
      },
    });

    return NextResponse.json(bands);
  } catch (error) {
    console.error("Error fetching bands:", error);
    return NextResponse.json({ error: "Error fetching bands" }, { status: 500 });
  }
}
