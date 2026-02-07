import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { username } = await request.json();

  if (!username?.trim()) {
    return NextResponse.json({ status: "invalid" }, { status: 400 });
  }

  const normalizedUsername = username.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { username: normalizedUsername },
  });

  if (!user) {
    return NextResponse.json({ status: "new" });
  } else if (!user.pin) {
    return NextResponse.json({ status: "needs_pin" });
  } else {
    return NextResponse.json({ status: "has_pin" });
  }
}
