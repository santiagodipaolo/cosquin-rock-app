import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Buscar token
    const shareToken = await prisma.shareToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            username: true,
            avatar: true,
          },
        },
      },
    });

    if (!shareToken) {
      return NextResponse.json({ error: "Link inválido" }, { status: 404 });
    }

    // Obtener bandas del usuario según el tipo
    const dayFilter = shareToken.type === "both"
      ? {}
      : { day: shareToken.type === "day1" ? 1 : 2 };

    const attendances = await prisma.attendance.findMany({
      where: {
        userId: shareToken.userId,
        band: dayFilter,
      },
      include: {
        band: true,
      },
      orderBy: {
        band: {
          startTime: "asc",
        },
      },
    });

    return NextResponse.json({
      username: shareToken.user.username,
      avatar: shareToken.user.avatar,
      type: shareToken.type,
      bands: attendances.map((a) => a.band),
    });
  } catch (error) {
    console.error("Error fetching shared agenda:", error);
    return NextResponse.json({ error: "Error al obtener agenda" }, { status: 500 });
  }
}
